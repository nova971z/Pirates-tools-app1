PIRATES TOOLS — PWA (Vanilla HTML/CSS/JS)
But : boutique légère (accueil, catalogue par marques → types → produits, PDP, panier/devis WhatsApp, compte, paiements CB/PayPal/Crypto), PWA hors-ligne.

URL prod : https://<user>.github.io/<repo>/
Routes (#hash) : #/, #/catalogue, #/catalogue?brand=<key>, #/produit/:id, #/devis, #/compte, #/checkout, #/paiement/success, #/paiement/annule

Arborescence minimale :
/               index.html · styles.css · app.js · products.json · sw.js · manifest.webmanifest
/icons/         icon-180.png, 192, 256, 384, 512
/images/        pirates-tools-logo.png (et .webp)
/images/brands/ dewalt.svg, makita.svg, milwaukee.svg, mafell.svg, festool.svg, flex.svg, stanley.svg, wera.svg, facom.svg
.github/workflows/pages.yml  (déploiement GitHub Pages)

Lancement local (nécessite un petit serveur pour le Service Worker) :
- Option Python :   python3 -m http.server 8080
- Option Node :     npx http-server -p 8080
Ouvre http://localhost:8080

Service Worker :
- Fichier : sw.js  |  Constante VERSION = 'pt-v84'  → l’incrémenter à chaque modif de sw.js pour invalider les anciens caches.
- Stratégies : app-shell précache, navigations network-first (+ fallback index), products.json network-first, CSS/JS SWR, images cache-first (interne loose / externe safe).

products.json (résumé du schéma) :
- id, sku, title, brand(+brand_key), category(+category_key), price/price_old, tags, specs/specs_kv, images, stock_*, whatsapp_template, rating/reviews…
- L’app dérive automatiquement : BRANDS (par brand_key) → TYPES (par category_key).

Marques (bulles catalogue) :
- DeWalt (dewalt), Makita (makita), Milwaukee (milwaukee), Mafell (mafell), Festool (festool), Flex (flex), Stanley (stanley), Wera (wera), Facom (facom)
- Clic bulle → #/catalogue?brand=<key> → sous-catégories (types) → liste produits filtrée.
- Effet « verre + glow tactile » géré en CSS (+ petite anim au tap).

Conventions de commit :
- style(scope): message  — ex: feat(router): brand→type flow ; fix(pdp): specs_kv merge
- bump(sw): pt-v85  quand sw.js change.

Déploiement :
- GitHub Pages (workflow fourni). Push sur main = déploiement.
- Si API (auth/paiements) hébergée ailleurs (Vercel/Netlify), configurer CORS pour l’origine GitHub Pages.

Contacts & WhatsApp :
- Téléphone E.164 : +33774230195 (wa.me)
- L’app compose des messages pré-remplis (produit / devis).

Checklist avant PR :
[ ] LCP < 2.5s  [ ] A11y ≥ 95  [ ] SW version bump  [ ] Liens WA OK  [ ] Routes hash OK  [ ] Aucune erreur console
