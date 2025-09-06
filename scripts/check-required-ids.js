/* =========================================================
   Pirates Tools — CI: vérif des IDs requis dans index.html
   Variante "PDP optionnelle" (pour dev sans produits)
   - Les IDs de la PDP passent en avertissements, pas en erreurs
   - Remets STRICT_PDP=1 (ou true) quand la PDP sera prête
========================================================= */
/* eslint-disable no-var */
'use strict';

var fs = require('fs');

var STRICT_PDP = process.env.STRICT_PDP === '1' || false;

module.exports = async function(){
  var errs  = [];
  var warns = [];

  // Base: IDs nécessaires pour l’app hors PDP
  var requiredBase = [
    // Hero
    'hero','heroLogo',

    // Vues principales (hors PDP)
    'view-home','view-catalogue','view-devis','view-compte',

    // Ancre a11y/CI
    'pdp',

    // Grilles & listes
    'brandGrid','catList','list',

    // Filtres catalogue
    'q','tag',

    // Devis
    'devisList','devisSend','devisClear',

    // Dock
    'dock','dockCount','dockQuoteBtn','dockCartBtn',

    // A11y / Toasts
    'sr-live','toasts'
  ];

  // Bloc PDP (rendu optionnel tant que STRICT_PDP = false)
  var pdpIds = [
    'view-produit',
    'pdpImg','pdpTitle','pdpTag','pdpDesc','pdpSpecs','pdpRelated',
    'pdpQuote','pdpWa','pdpShare'
  ];

  var requiredIds = STRICT_PDP ? requiredBase.concat(pdpIds) : requiredBase;
  var optionalIds = STRICT_PDP ? [] : pdpIds;

  // Lire index.html
  var html = fs.existsSync('index.html') ? fs.readFileSync('index.html','utf8') : '';
  if (!html) {
    errs.push('Fichier index.html manquant ou vide.');
    return errs;
  }

  // Helper: vérifier présence d’un id (quotes/espaces tolérés, insensible à la casse)
  function hasId(id){
    var safe = id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    var re = new RegExp('\\bid\\s*=\\s*["\\\']\\s*' + safe + '\\s*["\\\']', 'i');
    return re.test(html);
  }

  // IDs requis → erreurs
  for (var i=0;i<requiredIds.length;i++){
    var id = requiredIds[i];
    if (!hasId(id)) errs.push('index.html: id="#' + id + '" introuvable.');
  }

  // IDs optionnels (PDP) → avertissements uniquement
  for (var j=0;j<optionalIds.length;j++){
    var oid = optionalIds[j];
    if (!hasId(oid)) warns.push('index.html: id="#' + oid + '" manquant (optionnel tant que PDP non branchée).');
  }

  // Vérif assets principaux (<link>/<script>) — accepte ./, / ou sans préfixe
  if (!/<link\b[^>]*href=["']\.?\/?styles\.css["'][^>]*>/i.test(html)) {
    errs.push('index.html: <link href="styles.css"> manquant (rel="stylesheet").');
  }
  if (!/<script\b[^>]*src=["']\.?\/?app\.js["'][^>]*>/i.test(html)) {
    errs.push('index.html: <script src="app.js"> manquant.');
  }

  // Affiche les avertissements sans faire échouer la CI
  if (warns.length){
    console.warn('\n⚠️  check-required-ids: ' + warns.length + ' avertissement(s) (PDP optionnelle):');
    for (var k=0;k<warns.length;k++) console.warn('  - ' + warns[k]);
  }

  return errs;
};
