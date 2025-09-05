const reqIds = require('./check-required-ids');
const reqPaths = require('./check-paths');
const reqProducts = require('./check-products-json');

(async () => {
  let errors = [];
  try { errors = errors.concat(await reqIds()); } catch(e){ errors.push('[check-required-ids] ' + e.message); }
  try { errors = errors.concat(await reqPaths()); } catch(e){ errors.push('[check-paths] ' + e.message); }
  try { errors = errors.concat(await reqProducts()); } catch(e){ errors.push('[check-products-json] ' + e.message); }

  if (errors.length) {
    console.error('❌ CI FAILED — problèmes détectés:\n');
    errors.forEach((e, i) => console.error((i+1)+'. '+e));
    process.exit(1);
  } else {
    console.log('✅ CI OK — tous les contrôles sont passés.');
  }
})();
