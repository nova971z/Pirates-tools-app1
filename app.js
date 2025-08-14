/* =========================================================
   Pirates Tools — styles.css (FULL, fusion de toutes demandes)
   Thème sombre, topbar, hero zoom+fade, liste produits, footer
   ========================================================= */

/* ---------- Thème / variables ---------- */
:root{
  --bg:#0a0f14;
  --panel:#0e151c;
  --card:#121b24;
  --fg:#e6edf5;
  --muted:#9fb4c5;
  --border:#22303b;

  --brand:#19d3ff;   /* bleu/teal */
  --brand-2:#00e1b4; /* teal/vert */
  --wa-1:#25d366;    /* WhatsApp */
  --wa-2:#128c7e;

  --radius:14px;
  --shadow:0 10px 24px rgba(0,0,0,.35);

  /* Séparation voulue entre le hero et le 1er article (sans chevauchement) */
  --hero-gap-desktop:-18vh;  /* + vers 0  => plus d’espace ; – => rapproche */
  --hero-gap-mobile:-24vh;
}

/* ---------- Reset léger ---------- */
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;
  background:
    radial-gradient(60% 40% at 50% 30%, rgba(25,211,255,.08), transparent 70%),
    linear-gradient(180deg, #0a0f14 0%, #06141b 100%);
  color:var(--fg);
  font: 400 16px/1.6 system-ui, -apple-system, BlinkMacSystemFont, "Inter","Segoe UI", Roboto, Arial, sans-serif;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
}
a{color:inherit;text-decoration:none}
a:focus-visible,button:focus-visible{outline:2px solid var(--brand); outline-offset:2px; border-radius:10px}

/* Conteneur */
.container{width:min(1100px,92vw); margin:0 auto; position:relative; z-index:2}

/* =========================================================
   TOPBAR fixe + CTAs
   ========================================================= */
.topbar{
  position:sticky; top:0; inset-inline:0; z-index:12;
  display:grid; grid-template-columns:auto 1fr auto auto;
  align-items:center; gap:.8rem;
  padding:.7rem .9rem;
  background:rgba(10,15,20,.72);
  -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px);
  border-bottom:1px solid var(--border);
}
.menu-btn{all:unset; cursor:pointer; display:inline-grid; gap:3px; padding:.4rem}
.menu-btn span{width:18px; height:2px; background:var(--muted); border-radius:2px}
.brand{font-weight:800; letter-spacing:.2px; color:#fff}
.nav{display:flex; gap:.5rem; justify-content:center}
.chip{
  display:inline-flex; align-items:center; gap:.4rem;
  padding:.42rem .9rem; border-radius:999px;
  background:rgba(255,255,255,.04); border:1px solid var(--border); color:#d9e3ec;
  box-shadow: inset 0 -1px 0 rgba(255,255,255,.05);
}
.chip:hover{background:rgba(255,255,255,.07)}
.cta{display:flex; gap:.6rem; align-items:center}
.btn{
  display:inline-flex; align-items:center; gap:.5rem;
  padding:.58rem .9rem; border-radius:12px; font-weight:700;
  color:#001018; border:0; cursor:pointer; box-shadow:var(--shadow);
}
.btn-call{ background:linear-gradient(90deg, var(--brand) 0%, #7cf4ff 100%) }
.btn-wa{   background:linear-gradient(90deg, var(--wa-1) 0%, var(--wa-2) 100%); color:#042016 }
.btn:active{transform:translateY(1px)}

@media (max-width:960px){
  .topbar{grid-template-columns:auto 1fr auto; gap:.6rem}
  .nav{display:none}
}

/* =========================================================
   HERO (logo plein écran) : zoom massif + fondu + passage derrière
   ========================================================= */
.hero-full{
  position:sticky; top:0; height:100vh; inset-inline:0;
  display:grid; place-items:center;
  pointer-events:none; z-index:3; /* au-dessus au départ */
}
.hero-logo{
  width:min(78vmin,680px); height:auto;
  transform:translateZ(0) scale(1);    /* le JS ajuste la scale/opacity */
  transform-origin:center;
  will-change:transform, opacity;
  filter:drop-shadow(0 22px 44px rgba(0,0,0,.45));
}
.hero-fade{
  position:absolute; inset:auto 0 0 0; height:24vh; pointer-events:none;
  background:linear-gradient(180deg,
    rgba(10,15,20,0) 0%,
    rgba(10,15,20,.85) 60%,
    var(--bg) 100%);
}
/* Quand le logo est totalement fondu (classe posée par JS), il passe derrière */
.hero-full.is-hidden{ z-index:0; opacity:0; visibility:hidden; transition:opacity .25s ease, visibility 0s linear .25s }

/* Écart contrôlé (réduit, sans chevauchement) avec le 1er article */
main.container{ margin-top:var(--hero-gap-desktop) }
@media (max-width:768px){
  main.container{ margin-top:var(--hero-gap-mobile) }
}

/* =========================================================
   TOOLBAR recherche / filtre
   ========================================================= */
.toolbar{
  position:relative; z-index:2;
  width:min(1100px,92vw); margin:0 auto 1rem; padding:.4rem 0;
  display:grid; grid-template-columns:1fr 140px; gap:.6rem;
}
.search,.select{
  background:linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01));
  border:1px solid var(--border); border-radius:12px; color:var(--fg);
  padding:.85rem .9rem; box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
}
.search::placeholder{color:#7f94a5}

/* =========================================================
   LISTE PRODUITS / CARTES
   ========================================================= */
.list{display:grid; gap:1rem}
.card{
  background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
  box-shadow:var(--shadow); overflow:hidden; position:relative;
}
.card .head{
  display:flex; align-items:center; justify-content:space-between;
  padding:1rem 1.1rem .6rem; border-bottom:1px solid rgba(255,255,255,.04);
}
.title{margin:0; font-size:1.05rem}
.badge{
  display:inline-flex; align-items:center; padding:.35rem .7rem;
  border-radius:999px; font-weight:700; color:#cfeaf8;
  background:linear-gradient(180deg, rgba(25,211,255,.18), rgba(25,211,255,.06));
  border:1px solid rgba(25,211,255,.35);
}
.specs{display:flex; flex-wrap:wrap; gap:.5rem 1rem; padding:1rem 1.1rem}
.actions{display:flex; gap:.6rem; padding:0 1.1rem 1.1rem}
.btn.primary{
  background:linear-gradient(90deg, var(--brand) 0%, var(--brand-2) 100%);
  color:#001018; font-weight:800; padding:.7rem .95rem; border-radius:12px;
}

/* =========================================================
   AVIS + FOOTER (propre)
   ========================================================= */
.ratings{
  margin:2rem auto 1rem; width:min(1100px,92vw);
  background:var(--panel); border:1px solid var(--border); border-radius:var(--radius);
  padding:1rem 1.1rem; box-shadow:var(--shadow)
}
.ratings h2{margin:0 0 .5rem; font-size:1.05rem}
.ratings__list{margin:0; padding-left:1.1rem}

.foot{
  width:min(1100px,92vw); margin:1.5rem auto 3.5rem; color:var(--muted);
  border-top:1px solid var(--border); padding-top:1rem; font-size:.95rem;
}

/* =========================================================
   DOCK mobile (actions rapides)
   ========================================================= */
.dock{
  position:fixed; left:50%; bottom:14px; transform:translateX(-50%);
  display:flex; gap:.6rem; align-items:center;
  padding:.4rem .5rem; border-radius:999px; z-index:11;
  background:rgba(10,15,20,.66); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px);
  border:1px solid var(--border); box-shadow:var(--shadow);
}
.dock__btn{
  width:40px; height:40px; display:grid; place-items:center; border-radius:12px;
  background:rgba(255,255,255,.06); color:#d9e9f2; border:1px solid rgba(255,255,255,.08)
}
.dock__btn:active{transform:translateY(1px)}
.dock__btn:nth-child(1){background:linear-gradient(90deg, var(--brand) 0%, #7cf4ff 100%); color:#001018}
.dock__btn:nth-child(2){background:linear-gradient(90deg, var(--wa-1) 0%, var(--wa-2) 100%); color:#042016}
.dock__badge{
  position:absolute; right:-6px; top:-6px; background:#ff6b6b; color:#001018;
  font-weight:800; font-size:.75rem; line-height:1; border-radius:999px; padding:.35rem .45rem;
  border:2px solid rgba(10,15,20,.85)
}

/* UTILITAIRES */
.hidden{display:none !important}

/* Responsive fins */
@media (max-width:768px){
  .btn{padding:.54rem .8rem}
  .ratings{margin:1.4rem auto .6rem}
  .foot{margin:1rem auto 4.8rem}
}
