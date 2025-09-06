/* =========================================================
   Pirates Tools — CI runner
   - Agrège: check-required-ids, check-paths, check-products-json
   - + Optionnel: lint-products.js (si présent) sur products.json
   - Robuste: safe require, rapports clairs, exitCode propre
========================================================= */
/* eslint-disable no-var */
'use strict';

var fs   = require('fs');
var path = require('path');
var cp   = require('child_process');

function safeRequire(p, label){
  try { return require(p); }
  catch(e){ 
    console.warn('ℹ️  Module manquant ignoré:', label || p);
    return null;
  }
}
function asArray(x){
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return [String(x)];
}

var reqIds      = safeRequire('./check-required-ids', 'check-required-ids');
var reqPaths    = safeRequire('./check-paths',       'check-paths');
var reqProducts = safeRequire('./check-products-json','check-products-json');

// Détection d’un linter produits local (ajouté plus tôt)
var LINT_FILE = path.resolve(__dirname, './lint-products.js');
var HAS_LINT  = fs.existsSync(LINT_FILE);
var PRODUCTS_PATH = process.env.PRODUCTS_JSON || path.resolve(process.cwd(), './products.json');

function runLintProducts(){
  if (!HAS_LINT) return { errors:[], skipped:true };
  if (!fs.existsSync(PRODUCTS_PATH)){
    return { errors: ['[lint-products] Fichier introuvable: ' + PRODUCTS_PATH], skipped:false };
  }
  var args = [LINT_FILE, PRODUCTS_PATH]; // sans --fix en CI
  var res = cp.spawnSync(process.execPath, args, { stdio:'inherit' });
  var ok = (res.status === 0);
  return { errors: ok ? [] : ['[lint-products] a signalé des erreurs (voir logs ci-dessus)'], skipped:false };
}

(async function run(){
  var started = Date.now();
  var errors = [];

  async function runOne(fn, label){
    if (!fn) return;
    try {
      var out = await fn();                 // chaque check retourne [] d’erreurs
      errors = errors.concat(asArray(out)); // concatène
    } catch(e){
      errors.push('['+label+'] ' + (e && e.message ? e.message : e));
    }
  }

  await runOne(reqIds,      'check-required-ids');
  await runOne(reqPaths,    'check-paths');
  await runOne(reqProducts, 'check-products-json');

  // Linter produits optionnel
  var lintRes = runLintProducts();
  if (lintRes && lintRes.errors && lintRes.errors.length){
    errors = errors.concat(lintRes.errors);
  } else if (lintRes && lintRes.skipped){
    console.log('↪︎ lint-products.js absent — étape ignorée.');
  }

  var dur = Math.max(1, Date.now() - started);
  if (errors.length){
    console.error('\n❌ CI FAILED — problèmes détectés ('+errors.length+'):\n');
    errors.forEach(function(e, i){ console.error((i+1)+'. '+e); });
    console.error('\nRésumé: '+errors.length+' erreur(s) • durée: '+dur+'ms');
    process.exit(1);
  } else {
    console.log('\n✅ CI OK — tous les contrôles sont passés. ('+dur+'ms)');
  }
})();
