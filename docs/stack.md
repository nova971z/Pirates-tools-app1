# Stack & Architecture

## Objectif
Site e-commerce PWA léger : catalogue par marques → types → produits, PDP avec specs auto, panier + devis WhatsApp, compte (inscription/connexion/profil), paiements (CB, PayPal, Crypto). Hors-ligne fiable (SW).

## Front
- **Vanilla** HTML/CSS/JS (aucun bundler).
- **GitHub Pages** pour l’hébergement statique.
- **Hash router** : #/, #/catalogue, #/catalogue?brand=..., #/produit/:id, #/devis, #/compte, #/checkout, #/paiement/success, #/paiement/annule
- **PWA** : manifest + sw.js (network-first nav, SWR assets, cache-first images, trim caches).

## Données
- Départ : `products.json` (statique, mis en cache par SW).
- Évolution (option) : API read-only publique / DB (Supabase) pour produits.

## API (auth, profil, panier cloud, paiements)
- **Hébergement** : Vercel ou Netlify Functions (serverless).
- **Auth/DB** : Supabase (Postgres + Auth).
- **Paiements** :
  - Stripe (CB/Apple/Google Pay).
  - PayPal.
  - Coinbase Commerce (Crypto).
- **E-mails** : Resend (ou équivalent) pour confirmations.
- **WA** : WhatsApp Business (ou simple `wa.me` côté client).

### Endpoints (esquisse)
- `POST /api/auth/register|login|logout|refresh`
- `GET /api/user/me` · `PATCH /api/user`
- `GET/PUT /api/cart`
- `POST /api/pay/checkout` (body: {items, profile, method})
- Webhooks : `/api/webhooks/stripe|paypal|coinbase` → mise à jour commande/paiement
- (Option) `POST /api/wa/quote` (devis spéciaux)

### Sécurité & CORS
- Cookies HttpOnly (JWT access court + refresh).
- Rate limiting par IP + clé.
- CORS : **autoriser l’origine GitHub Pages uniquement** (prod + staging).
- Validation schéma (zod/ajv).
- Secrets en variables d’environnement (jamais commitées).

## Environnements
- `production` : domaine GitHub Pages + API prod (Vercel/Netlify).
- `staging` : branche/instance API séparée (clés sandbox Stripe/PayPal/Coinbase).

## Variables d’environnement (voir /.env.sample)
- Front lit l’API via `API_BASE_URL`. Les autres secrets restent **serveur** uniquement.
