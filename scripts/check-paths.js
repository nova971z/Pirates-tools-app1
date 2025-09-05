const fs = require('fs');
const path = require('path');

function collectFromHTML(html){
  const re = /(src|href)=["'](\.\/images\/[^"']+)["']/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[2]);
  return out;
}
function collectFromCSS(css){
  const re = /url\(([^)]+)\)/gi;
  const out = [];
  let m;
  while ((m = re.exec(css))) {
    let u = (m[1] || '').trim().replace(/^["']|["']$/g,'');
    if (/^\.\/images\//.test(u) && !/^data:/.test(u)) out.push(u);
  }
  return out;
}
function collectFromJS(js){
  const re = /["'](\.\/images\/[^"']+)["']/g;
  const out = [];
  let m;
  while ((m = re.exec(js))) out.push(m[1]);
  return out;
}

module.exports = async function(){
  const errs = [];
  const files = {
    html: fs.existsSync('index.html') ? fs.readFileSync('index.html','utf8') : '',
    css:  fs.existsSync('styles.css') ? fs.readFileSync('styles.css','utf8') : '',
    js:   fs.existsSync('app.js')     ? fs.readFileSync('app.js','utf8')     : ''
  };
  const set = new Set();
  collectFromHTML(files.html).forEach(p=>set.add(p));
  collectFromCSS(files.css).forEach(p=>set.add(p));
  collectFromJS(files.js).forEach(p=>set.add(p));

  // Vérifie l’existence de chaque fichier
  for (const rel of set) {
    const full = path.join(process.cwd(), rel);
    if (!fs.existsSync(full)) errs.push(`Chemin image introuvable: ${rel}`);
  }
  return errs;
};
