import { promises as fs } from 'fs';
import path from 'path';

export async function run(){
  const root = process.cwd();
  const file = path.join(root,'products.json');

  // S'il n'existe pas, on ne bloque pas la CI (warning)
  try { await fs.access(file); }
  catch { console.log('ℹ️  products.json non présent — check ignoré'); return; }

  let json;
  try { json = JSON.parse(await fs.readFile(file,'utf8')); }
  catch (e){ throw new Error('products.json invalide (JSON.parse)'); }

  const list = Array.isArray(json) ? json : (Array.isArray(json.products) ? json.products : null);
  if (!Array.isArray(list)) throw new Error('products.json doit être un tableau ou {products: []}');

  // Contrôles minimaux
  for (const [i,p] of list.entries()){
    if (!p) throw new Error(`Produit ${i}: entrée vide`);
    if (!('id' in p) && !('sku' in p) && !('title' in p))
      throw new Error(`Produit ${i}: id/sku/title manquant`);
  }
}
