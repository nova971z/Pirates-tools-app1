import { promises as fs } from 'fs';
import path from 'path';

export async function run(){
  const root = process.cwd();
  const file = path.join(root, 'index.html');
  let html = '';
  try { html = await fs.readFile(file, 'utf8'); }
  catch { throw new Error('index.html introuvable à la racine'); }

  const needIds = [
    'view-home','view-catalogue','view-produit','view-devis', // vues clés SPA
    'list','catList','pdp','devisList',                      // conteneurs de contenu
    'dock','toasts'                                          // dock & toasts
  ];
  for (const id of needIds){
    const ok = new RegExp(`id=["']${id}["']`).test(html);
    if (!ok) throw new Error(`id requis manquant: #${id}`);
  }

  // Vérifier que styles.css et app.js sont référencés
  const hasCSS = /<link[^>]+href=["']\.\/?styles\.css(\?[^"']*)?["'][^>]*>/i.test(html);
  if (!hasCSS) throw new Error('styles.css non référencé dans index.html');

  const hasJS = /<script[^>]+src=["']\.\/?app\.js(\?[^"']*)?["'][^>]*><\/script>/i.test(html);
  if (!hasJS) throw new Error('app.js non référencé dans index.html');
}
