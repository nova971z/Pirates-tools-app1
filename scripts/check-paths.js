import { promises as fs } from 'fs';
import path from 'path';

function normalize(p){
  return p.split('#')[0].split('?')[0];
}

export async function run(){
  const root = process.cwd();
  const htmlPath = path.join(root,'index.html');
  const html = await fs.readFile(htmlPath,'utf8');

  // Récupérer src/href locaux (png|jpg|jpeg|webp|svg|ico|css|js)
  const rx = /(src|href)=["']([^"']+\.(?:png|jpg|jpeg|webp|svg|ico|css|js)(?:\?[^"']*)?)["']/ig;
  const found = new Set();
  let m;
  while ((m = rx.exec(html)) !== null){
    const url = m[2];
    if (/^(https?:)?\/\//i.test(url) || url.startsWith('mailto:')) continue;
    found.add(normalize(url.replace(/^\.\//,'')));
  }

  for (const rel of found){
    const abs = path.join(root, rel);
    try { await fs.access(abs); }
    catch { throw new Error(`Chemin référencé introuvable: ${rel}`); }
  }
}
