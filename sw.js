/* Simple SW cache-first avec fallback réseau + nettoyage de versions */
const VERSION = 'pt-v1';
const CORE = [
  '/', '/index.html',
  '/styles.css', '/app.js',
  '/produits.json',
  '/manifeste.webmanifest'
];

// Si ce fichier est chargé dans la page, l'enregistrer (fallback
// au cas où l'enregistrement via app
