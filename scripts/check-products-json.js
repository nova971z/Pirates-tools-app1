#!/usr/bin/env node
/* eslint-disable no-var */
(function(){
  'use strict';

  var fs = require('fs');
  var path = require('path');

  /* ---------- CLI ---------- */
  var file = process.argv[2] || './products.json';
  var DO_FIX = process.argv.indexOf('--fix') !== -1;

  function readJson(p){
    var raw = fs.readFileSync(p, 'utf8');
    var data = JSON.parse(raw);
    var arr = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : null);
    if (!arr) throw new Error('Le JSON doit être un tableau ou { "products": [...] }');
    return { root:data, list:arr, isWrapped:!Array.isArray(data) };
  }

  function saveJson(p, root, list, isWrapped){
    var out = isWrapped ? Object.assign({}, root, { products:list }) : list;
    fs.writeFileSync(p, JSON.stringify(out, null, 2)+'\n', 'utf8');
  }

  /* ---------- Utils ---------- */
  function isNum(n){ return typeof n === 'number' && isFinite(n); }
  function toNum(x){
    if (x == null) return x;
    if (typeof x === 'number') return x;
    var n = Number(String(x).replace(',', '.').trim());
    return isFinite(n) ? n : x;
  }
  function round(n, d){
    d = (d==null)?0:d;
    var f = Math.pow(10, d);
    return Math.round(n * f) / f;
  }
  function computePct(priceOld, price){
    if (!isNum(priceOld) || !isNum(price) || priceOld <= 0) return null;
    var pct = (priceOld - price) / priceOld * 100;
    return Math.round(pct); // arrondi entier
  }
  function computeCents(price){
    if (!isNum(price)) return null;
    return Math.round(price * 100);
  }

  /* ---------- Lint ---------- */
  function lint(list, opts){
    var errors = [];
    var warns  = [];
    var fixes  = 0;

    var seenId = Object.create(null);
    var seenSku= Object.create(null);

    for (var i=0;i<list.length;i++){
      var p = list[i];
      var ctx = 'item['+i+']'+(p && p.id ? ' ('+p.id+')' : '');

      // Existence minimale
      var req = ['id','sku','title','brand','brand_key','category','currency'];
      for (var r=0;r<req.length;r++){
        var k = req[r];
        if (!p || p[k]==null || p[k]===''){
          errors.push(ctx+': champ obligatoire manquant "'+k+'"');
        }
      }

      // Unicité id/sku
      if (p && p.id){
        if (seenId[p.id]) errors.push(ctx+': id dupliqué "'+p.id+'" (déjà vu '+seenId[p.id]+')');
        seenId[p.id] = ctx;
      }
      if (p && p.sku){
        if (seenSku[p.sku]) errors.push(ctx+': sku dupliqué "'+p.sku+'" (déjà vu '+seenSku[p.sku]+')');
        seenSku[p.sku] = ctx;
      }

      // slug conseillé
      if (!p.slug){
        warns.push(ctx+': "slug" manquant (conseillé = id en kebab-case)');
      }

      // price / price_cents
      var origPrice = p.price;
      var origCents = p.price_cents;
      var price = toNum(p.price);
      var cents = toNum(p.price_cents);

      if (typeof price !== 'number'){
        errors.push(ctx+': "price" non numérique ou manquant');
      }
      if (typeof cents !== 'number'){
        // si manquant, on peut calculer
        var calc = computeCents(price);
        if (calc != null){
          if (opts.fix){
            p.price_cents = calc;
            fixes++;
          } else {
            warns.push(ctx+': "price_cents" manquant → devrait être '+calc);
          }
        }
      } else {
        // vérifier cohérence
        var should = computeCents(price);
        if (isNum(should) && cents !== should){
          if (opts.fix){
            p.price_cents = should;
            fixes++;
          } else {
            warns.push(ctx+': incohérence price_cents='+cents+' ≠ '+should+' (depuis price='+price+')');
          }
        }
      }

      // discount_percent
      var priceOld = toNum(p.price_old);
      if (p.hasOwnProperty('price_old') && isNum(priceOld) && isNum(price) && priceOld > 0){
        var pct = computePct(priceOld, price);
        if (pct != null){
          var cur = toNum(p.discount_percent);
          if (!isNum(cur)){
            if (opts.fix){ p.discount_percent = pct; fixes++; }
            else warns.push(ctx+': "discount_percent" manquant → devrait être '+pct+'%');
          } else if (cur !== pct){
            if (opts.fix){ p.discount_percent = pct; fixes++; }
            else warns.push(ctx+': "discount_percent"='+cur+'% incohérent → devrait être '+pct+'%');
          }
          if (price >= priceOld){
            warns.push(ctx+': "price" ('+price+') ≥ "price_old" ('+priceOld+') — remise non positive');
          }
        }
      } else {
        // Pas de price_old → discount_percent superflu ?
        if (p.hasOwnProperty('discount_percent') && p.discount_percent){
          warns.push(ctx+': "discount_percent" présent sans "price_old" — ignoré par la plupart des UIs');
        }
      }

      // Types numériques recommandés
      var numericFields = [
        'torque_nm','weight_kg','length_mm','warranty_months','stock_qty','rating','reviews'
      ];
      for (var nf=0; nf<numericFields.length; nf++){
        var kf = numericFields[nf];
        if (p.hasOwnProperty(kf)){
          var v = toNum(p[kf]);
          if (typeof v !== 'number' || !isFinite(v)){
            warns.push(ctx+': "'+kf+'" devrait être numérique (actuel: '+p[kf]+')');
          } else if (v !== p[kf] && opts.fix){
            p[kf] = v; fixes++;
          }
        }
      }

      // stock_status vs stock_qty (heuristique)
      if (p.stock_status && isNum(p.stock_qty)){
        var st = String(p.stock_status||'').toLowerCase();
        if (p.stock_qty === 0 && st !== 'out_of_stock'){
          warns.push(ctx+': stock_qty=0 mais stock_status="'+p.stock_status+'"');
        }
        if (p.stock_qty > 0 && st === 'out_of_stock'){
          warns.push(ctx+': stock_qty>0 mais stock_status="out_of_stock"');
        }
      }

      // URLs d'image (validation basique)
      if (!p.img){
        warns.push(ctx+': "img" manquant (une image principale est recommandée)');
      } else if (typeof p.img !== 'string' || !/^https?:\/\/|^\.\//.test(p.img)){
        warns.push(ctx+': "img" semble invalide: '+p.img);
      }
    }

    return { errors:errors, warns:warns, fixes:fixes };
  }

  /* ---------- Run ---------- */
  try{
    var abs = path.resolve(process.cwd(), file);
    if (!fs.existsSync(abs)) throw new Error('Fichier introuvable: '+abs);

    var parsed = readJson(abs);
    var out = lint(parsed.list, { fix: DO_FIX });

    // Sauvegarde si --fix
    if (DO_FIX && out.fixes > 0){
      saveJson(abs, parsed.root, parsed.list, parsed.isWrapped);
    }

    // Reporting
    if (out.errors.length){
      console.error('\n❌ Erreurs ('+out.errors.length+')');
      for (var i=0;i<out.errors.length;i++) console.error('  - '+out.errors[i]);
    }
    if (out.warns.length){
      console.warn('\n⚠️  Avertissements ('+out.warns.length+')');
      for (var j=0;j<out.warns.length;j++) console.warn('  - '+out.warns[j]);
    }
    if (DO_FIX){
      console.log('\n🔧 Corrections appliquées:', out.fixes);
      if (out.fixes > 0) console.log('   → fichier réécrit:', file);
    }

    if (out.errors.length){
      process.exitCode = 1;
      console.error('\nRésumé: '+out.errors.length+' erreur(s), '+out.warns.length+' avertissement(s).');
    } else {
      console.log('\n✅ OK — 0 erreur, '+out.warns.length+' avertissement(s).');
    }
  }catch(err){
    console.error('Erreur:', err.message || err);
    process.exit(1);
  }
})();
