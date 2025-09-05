const fs = require('fs');
const path = require('path');
const ALLOWED_BRANDS = ['dewalt','milwaukee','makita','festool','flex','wera','stanley','facom'];

function isRel(p){ return typeof p === 'string' && p.startsWith('./'); }

module.exports = async function(){
  const errs = [];
  if (!fs.existsSync('products.json')) {
    errs.push('products.json manquant.');
    return errs;
  }
  let data;
  try{
    data = JSON.parse(fs.readFileSync('products.json','utf8'));
  }catch(e){
    errs.push('products.json invalide: ' + e.message);
    return errs;
  }
  const list = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : null);
  if (!Array.isArray(list) || list.length === 0){
    errs.push('products.json: tableau de produits manquant ou vide.');
    return errs;
  }

  list.forEach((p, i) => {
    const ix = `products[${i}]`;
    if (!p || (typeof p !== 'object')) { errs.push(`${ix}: entrée invalide`); return; }
    if (!p.id && !p.sku) errs.push(`${ix}: id ou sku requis.`);
    if (p.brand_key && !ALLOWED_BRANDS.includes(String(p.brand_key).toLowerCase())) {
      errs.push(`${ix}: brand_key inconnu "${p.brand_key}".`);
    }
    if (p.price_cents != null && typeof p.price_cents !== 'number') {
      errs.push(`${ix}: price_cents doit être number si présent.`);
    }
    if (p.price != null && typeof p.price !== 'number') {
      errs.push(`${ix}: price doit être number si présent (sinon utiliser price_cents).`);
    }

    // Images
    const imgs = [];
    if (p.img) imgs.push(p.img);
    if (Array.isArray(p.gallery)) p.gallery.forEach(g => imgs.push(g));
    imgs.forEach(rel => {
      if (isRel(rel)) {
        const full = path.join(process.cwd(), rel);
        if (!fs.existsSync(full)) errs.push(`${ix}: image manquante ${rel}`);
      }
    });
  });

  return errs;
};
