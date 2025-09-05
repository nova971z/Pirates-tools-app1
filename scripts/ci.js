import { run as checkRequiredIds } from './check-required-ids.js';
import { run as checkPaths } from './check-paths.js';
import { run as checkProducts } from './check-products-json.js';

const failures = [];
async function step(name, fn){
  try { await fn(); console.log('✅', name); }
  catch (e){ failures.push(name); console.error('❌', name, '-', e.message || e); }
}

await step('index.html — ids & références requises', checkRequiredIds);
await step('index.html — chemins d’assets existants', checkPaths);
await step('products.json — validité & champs', checkProducts);

if (failures.length){
  console.error('\nCI FAILED:', failures.join(', '));
  process.exit(1);
}
console.log('\nAll checks passed.');
