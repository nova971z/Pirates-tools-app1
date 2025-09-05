const fs = require('fs');

module.exports = async function(){
  const errs = [];
  const mustIds = [
    // Hero
    'hero','heroLogo',
    // Home / Catalogue / Devis / Compte / PDP
    'view-home','view-catalogue','view-devis','view-compte','pdp',
    // Grilles & listes
    'brandGrid','catList','list',
    // Filtres
    'q','tag',
    // PDP elements
    'pdpImg','pdpTitle','pdpTag','pdpDesc','pdpSpecs','pdpRelated',
    'pdpQuote','pdpWa','pdpShare',
    // Devis
    'devisList','devisSend','devisClear',
    // Dock
    'dock','dockCount','dockQuoteBtn','dockCartBtn',
    // A11y / Toasts
    'sr-live','toasts'
  ];

  const html = fs.existsSync('index.html') ? fs.readFileSync('index.html','utf8') : '';
  if (!html) {
    errs.push('Fichier index.html manquant ou vide.');
    return errs;
  }

  // Vérif IDs
  mustIds.forEach(id => {
    const re = new RegExp(`id=["']${id}["']`);
    if (!re.test(html)) errs.push(`index.html: id="#${id}" introuvable.`);
  });

  // Vérif liens <link> et <script>
  if (!/href=["']\.\/styles\.css["']/.test(html)) errs.push('index.html: <link href="./styles.css"> manquant.');
  if (!/src=["']\.\/app\.js["']/.test(html)) errs.push('index.html: <script src="./app.js"> manquant.');

  return errs;
};
