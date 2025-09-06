#!/usr/bin/env node
/* eslint-disable no-var */
'use strict';

var fs   = require('fs');
var path = require('path');

/* =========================================================
   Cœur du module (réutilisé par la CI et le CLI)
========================================================= */

function readJson(p){
  var raw = fs.readFileSync(p, 'utf8');
  var data = JSON.parse(raw);
  var arr = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : null);
  if (!arr) throw new Error('Le JSON doit être un tableau ou { "products": [...] }');
  return { root:data, list:arr, isWrapped:!Array.isArray(data) };
}

function saveJson(p, root, list, isWrapped){
  var out = isWrapped ? Object.assign({}, root, { products:list }) : list;
  fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n', 'utf8');
}

/* ---------- Utils ---------- */
function isNum(n){ return typeof n === 'number' && isFinite(n); }
function toNum(x){
  if (x == null) return x;
  if (typeof x === 'number') return x;
  var n = Number(String(x).replace(',', '.').trim());
  return isFinite(n) ? n : x;
}
function computePct(priceOld, price){
  if (!isNum(priceOld) || !isNum(price) || priceOld <= 0) return null;
  return Math.round((priceOld - price) / priceOld * 100);
}
function computeCents(price){
  if (!isNum(price)) return null;
  return Math.round(price * 100);
}

/* ---------- Linting logique ---------- */
function lintList(list, opts){
  opts = opts || {};
  var errors = [];
  var warns  = [];
  var fixes  = 0;

  var seenId  = Object.create(null);
  var seenSku = Object.create(null);

  for (var i=0;i<list.length;i++){
    var p = list[i] || {};
    var ctx = 'item['+i+']' + (p.id ? ' ('+p.id+')' : '');

    // Champs minimaux
    var req = ['id','sku','title','brand','currency'];
    for (var r=0;r<req.length;r++){
      var k = req[r];
      if (p[k]==null || p[k]===''){
        errors.push(ctx+': champ obligatoire manquant "'+k+'"');
      }
    }

    // Unicité
    if (p.id){
      if (seenId[p.id]) errors.push(ctx+': id dupliqué "'+p.id+'" (déjà vu '+seenId[p.id]+')');
      seenId[p.id] = ctx;
    }
    if (p.sku){
      if (seenSku[p.sku]) errors.push(ctx+': sku dupliqué "'+p.sku+'" (déjà vu '+seenSku[p.sku]+')');
      seenSku[p.sku] = ctx;
    }

    // Prix & cohérences
    var price = toNum(p.price);
    var cents = toNum(p.price_cents);

    if (!isNum(price)) {
      errors.push(ctx+': "price" non numérique ou manquant');
    }

    var shouldCents = computeCents(price);
    if (!isNum(cents)) {
      if (isNum(shouldCents)) {
        if (opts.fix){ p.price_cents = shouldCents; fixes++; }
        else warns.push(ctx+': "price_cents" manquant → devrait être '+shouldCents);
      }
    } else if (isNum(shouldCents) && cents !== shouldCents) {
      if (opts.fix){ p.price_cents = shouldCents; fixes++; }
      else warns.push(ctx+': incohérence price_cents='+cents+' ≠ '+shouldCents);
    }

    var priceOld = toNum(p.price_old);
    if (isNum(priceOld) && isNum(price) && priceOld > 0){
      var pct = computePct(priceOld, price);
      var cur = toNum(p.discount_percent);
      if (!isNum(cur)){
        if (opts.fix){ p.discount_percent = pct; fixes++; }
        else warns.push(ctx+': "discount_percent" manquant → '+pct+'%');
      } else if (cur !== pct){
        if (opts.fix){ p.discount_percent = pct; fixes++; }
        else warns.push(ctx+': "discount_percent"='+cur+'% incohérent → '+pct+'%');
      }
      if (price >= priceOld){
        warns.push(ctx+': "price" ('+price+') ≥ "price_old" ('+priceOld+') — remise non positive');
      }
    } else if (p.hasOwnProperty('discount_percent') && p.discount_percent){
      warns.push(ctx+': "discount_percent" présent sans "price_old"');
    }

    // Types numériques conseillés
    var numericFields = ['torque_nm','weight_kg','length_mm','warranty_months','stock_qty','rating','reviews'];
    for (var nf=0; nf<numericFields.length; nf++){
      var kf = numericFields[nf];
      if (p.hasOwnProperty(kf)){
        var v = toNum(p[kf]);
        if (!isNum(v)){
          warns.push(ctx+': "'+kf+'" devrait être numérique (actuel: '+p[kf]+')');
        } else if (v !== p[kf] && opts.fix){
          p[kf] = v; fixes++;
        }
      }
    }

    // Images (validation simple)
    if (!p.img){
      warns.push(ctx+': "img" manquant (recommandé)');
    } else if (typeof p.img !== 'string' || !/^https?:\/\/|^\.\//.test(p.img)){
      warns.push(ctx+': "img" semble invalide: '+p.img);
    }
  }

  return { errors:errors, warns:warns, fixes:fixes };
}

/* =========================================================
   Fonction exportée pour la CI
   - Retourne: Array<string> (SEULEMENT les erreurs bloquantes)
   - Si products.json absent ou vide → [] (toléré)
========================================================= */
async function checkProductsJson(options){
  options = options || {};
  var file = options.file || './products.json';
  var fix  = !!options.fix;

  var abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    // Pas de produits pour l’instant → pas d’échec CI
    return [];
  }

  var parsed;
  try {
    parsed = readJson(abs);
  } catch (e) {
    return ['products.json invalide: ' + (e.message || e)];
  }

  // 0 produit → toléré
  if (!parsed.list || parsed.list.length === 0) return [];

  var out = lintList(parsed.list, { fix: fix });

  // Ne renvoyer que les erreurs à la CI
  if (fix && out.fixes > 0) {
    try { saveJson(abs, parsed.root, parsed.list, parsed.isWrapped); } catch(_) {}
  }

  return out.errors;
}

module.exports = checkProductsJson;

/* =========================================================
   Mode CLI (node scripts/check-products-json.js [file] [--fix])
========================================================= */
if (require.main === module) {
  (function(){
    var fileArg = process.argv[2] || './products.json';
    var DO_FIX  = process.argv.indexOf('--fix') !== -1;

    var abs = path.resolve(process.cwd(), fileArg);
    if (!fs.existsSync(abs)) {
      console.log('↪ check-products-json: '+fileArg+' absent — étape ignorée.');
      process.exit(0);
      return;
    }

    var parsed;
    try {
      parsed = readJson(abs);
    } catch (e) {
      console.error('❌ products.json invalide: ' + (e.message || e));
      process.exit(1);
      return;
    }

    var out = lintList(parsed.list, { fix: DO_FIX });

    if (DO_FIX && out.fixes > 0){
      try { saveJson(abs, parsed.root, parsed.list, parsed.isWrapped); }
      catch (e){ console.warn('⚠️  impossible d’écrire le fichier:', e && e.message ? e.message : e); }
    }

    if (out.errors.length){
      console.error('\n❌ Erreurs ('+out.errors.length+')');
      for (var i=0;i<out.errors.length;i++) console.error('  - '+out.errors[i]);
    } else {
      console.log('\n✅ OK — 0 erreur.');
    }

    if (out.warns.length){
      console.warn('\n⚠️  Avertissements ('+out.warns.length+')');
      for (var j=0;j<out.warns.length;j++) console.warn('  - '+out.warns[j]);
    }

    if (DO_FIX){
      console.log('\n🔧 Corrections appliquées:', out.fixes);
      if (out.fixes > 0) console.log('   → fichier réécrit:', fileArg);
    }

    process.exit(out.errors.length ? 1 : 0);
  })();
}
