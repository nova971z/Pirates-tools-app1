/* =========================================================
   Pirates Tools — CI: vérif des chemins d'images
   - Scanne index.html, styles.css, app.js
   - Extrait ./images/…, /images/…, images/…
   - Ignore data: et http(s): ; retire ?v=… et #…
   - Déduplique ; retourne uniquement un tableau d'erreurs
========================================================= */
/* eslint-disable no-var */
'use strict';

var fs   = require('fs');
var path = require('path');

/* ---------- Config ---------- */
var OPTIONAL_BASENAMES = [
  // fallback runtime utilisé dans app.js → toléré s'il manque
  'pirates-tools-logo.png'
];

/* ---------- Utils ---------- */
function readIfExists(p){ return fs.existsSync(p) ? fs.readFileSync(p,'utf8') : ''; }
function stripQueryHash(u){
  return String(u||'').split('#')[0].split('?')[0];
}
function isHttp(u){ return /^https?:\/\//i.test(u); }
function isData(u){ return /^data:/i.test(u); }
function looksImagePath(u){
  return /^\.?\/?images\//i.test(u); // ./images…, /images…, images…
}
function normalizeRel(u){
  u = stripQueryHash(u).trim().replace(/^['"]|['"]$/g,'');
  if (!u) return '';
  // unifie /images -> ./images  ; images -> ./images
  if (/^\/images\//i.test(u)) u = '.' + u;
  if (/^images\//i.test(u))   u = './' + u;
  return u;
}
function pushAll(targetSet, arr){
  for (var i=0;i<arr.length;i++){ targetSet.add(arr[i]); }
}

/* ---------- Collectors ---------- */
function collectFromHTML(html){
  // src|href=".../images/…"
  var re = /(src|href)=["']([^"']+)["']/gi;
  var out = [];
  var m;
  while ((m = re.exec(html))){
    var u = normalizeRel(m[2]);
    if (!u || isHttp(u) || isData(u)) continue;
    if (looksImagePath(u)) out.push(u);
  }
  return out;
}
function collectFromCSS(css){
  // url(…)
  var re = /url\(([^)]+)\)/gi;
  var out = [];
  var m;
  while ((m = re.exec(css))){
    var raw = (m[1]||'').trim().replace(/^["']|["']$/g,'');
    var u = normalizeRel(raw);
    if (!u || isHttp(u) || isData(u)) continue;
    if (looksImagePath(u)) out.push(u);
  }
  return out;
}
function collectFromJS(js){
  // capture toute chaîne "./images/…"
  var re = /["']([^"']+)["']/g;
  var out = [];
  var m;
  while ((m = re.exec(js))){
    var u = normalizeRel(m[1]);
    if (!u || isHttp(u) || isData(u)) continue;
    if (looksImagePath(u)) out.push(u);
  }
  return out;
}

/* ---------- Main ---------- */
module.exports = async function(){
  var errs = [];

  // charge les 3 fichiers standards à la racine
  var files = {
    html: readIfExists(path.join(process.cwd(), 'index.html')),
    css:  readIfExists(path.join(process.cwd(), 'styles.css')),
    js:   readIfExists(path.join(process.cwd(), 'app.js'))
  };

  var pathsSet = new Set();
  pushAll(pathsSet, collectFromHTML(files.html));
  pushAll(pathsSet, collectFromCSS(files.css));
  pushAll(pathsSet, collectFromJS(files.js));

  // vérifie l’existence de chaque fichier (en retirant query/hash déjà fait)
  pathsSet.forEach(function(rel){
    var base = path.basename(rel);
    var full = path.join(process.cwd(), rel);

    // tolère certains basenames optionnels (fallbacks runtime)
    if (OPTIONAL_BASENAMES.indexOf(base) !== -1 && !fs.existsSync(full)){
      return; // ignoré
    }

    if (!fs.existsSync(full)){
      errs.push('Chemin image introuvable: ' + rel);
    }
  });

  return errs;
};
