/* =========================================================================
   Pirates Tools — STYLES.CSS (complet)
   Style original + LOGO très grand + fondu + séparation nette
   ========================================================================= */

:root{
  --bg:#0a0f14;
  --panel:#0e151c;
  --card:#121b24;
  --fg:#f4f7fb;
  --muted:#9fb4c3;
  --brand:#19d3ff;
  --accent:#7c4dff;
  --border:#203040;
  --r:1rem;
}

*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;
  background:linear-gradient(180deg,#0a0f14 0%, #060a10 40%, #0a0f14 100%);
  color:var(--fg);
  font-family:-apple-system, BlinkMacSystemFont, "Inter", Segoe UI, Roboto, Arial, sans-serif;
  line-height:1.8;
  letter-spacing:.2px;
}

.container{width:min(1100px,92vw); margin:0 auto}

/* ───────────────── Top bar / CTA (identique style) */
.topbar{
  position:sticky; top:0; z-index:1000;
  display:flex; align-items:center; justify-content:space-between; gap:.8rem;
  padding:.8rem 1rem;
  border-bottom:1px solid rgba(16,25,32,.18);
  background:rgba(10,15,20,.86);
  backdrop-filter: blur(10px);
}
.brand{font-weight:800}

.actions{display:flex; gap:.6rem; align-items:center}
.btn{
  display:inline-block; text-decoration:none;
  padding:.72rem .9rem; border:1px solid var(--border);
  border-radius:10px; color:var(--fg);
}
.btn.cta{ background:linear-gradient(90deg,#0fe0ff,#15f7b8); color:#001018; font-weight:800; border:0 }
.btn.wa{ background:#25D366; color:#001018; border:0 }

/* ───────────────── LISTE d'articles */
.list{display:grid; gap:1rem; padding:1.2rem 0 2.5rem}
@media (min-width: 800px){ .list{ grid-template-columns: repeat(3, minmax(0,1fr)); } }

.card{
  background:var(--card); border:1px solid var(--border);
  border-radius:12px;
  box-shadow: 0 10px 24px rgba(10,15,20,.35);
  overflow:hidden;
  opacity:0; transform: translateY(14px);
  transition: opacity .28s ease, transform .28s ease;
}
.card.is-in{ opacity:1; transform:none; }

.head{
  display:flex; align-items:center; justify-content:space-between; gap:1rem;
  padding:1rem 1.2rem; border-bottom:1px solid var(--border);
}
.title{margin:0; font-size:1.2rem}
.pill,.badge{
  padding:.35rem .6rem; border-radius:10px; font-size:.8rem;
  color:#001018;
  background:linear-gradient(90deg,#0fe0ff,#15f7b8);
  border:1px solid rgba(0,16,24,.12);
}
.figure{
  display:grid; place-items:center;
  background:
    radial-gradient(400px 200px at 50% 30%,rgba(25,211,255,.08),transparent),
    linear-gradient(180deg,#0a0f14 0%, #060a10 60%, #0a0f14 100%);
}
.figure img{max-width:100%; height:auto; display:block}
.specs{display:flex; flex-wrap:wrap; gap:.6rem; padding:1rem 1.2rem}
.spec{background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:.6rem .8rem}
.k{opacity:.7; font-size:.85rem}
.v{font-weight:600}
.actions{display:flex; gap:.6rem; padding:1rem 1.2rem; align-items:center; flex-wrap:wrap}
.price{font-weight:800}
.btn.primary{ background:linear-gradient(90deg,var(--brand),var(--accent)); color:#001018; border:0; font-weight:800 }

/* ───────────────── FOOTER simple */
.foot{color:var(--muted); border-top:1px solid var(--border); padding:1rem 0}

/* ========================================================================
   HERO (Logo au-dessus) + possibilité de zoom ÉNORME + fondu + séparation
   ======================================================================== */

.scene{ perspective:1000px; } /* profondeur 3D pour l’inclinaison (tilt) */

/* Le HERO reste devant visuellement pendant l’animation */
.hero-full{
  position:relative;            /* pas fixed → plus de compat avec spacer */
  overflow:visible;             /* IMPORTANT : autorise le logo à dépasser quand il grossit */
  z-index:30;                   /* au-dessus de la liste (z:10) */
  background:
    radial-gradient(60% 40% at 50% 30%, rgba(25,211,255,.08), transparent),
    linear-gradient(180deg, #0a0f14 0%, #060a10 60%, #0a0f14 100%);
  padding-top:.5rem;
}

/* LOGO — base plus grande + transform fluide ; prêt pour un zoom énorme */
.hero-logo{
  display:block; margin:0 auto;
  /* base très large : desktop jusqu’à 1400px, mobile quasi plein écran */
  max-width: clamp(420px, 96vw, 1400px);
  height:auto;

  will-change: transform, opacity;  /* (hint perf) */
  transform-origin:center center;
  filter: drop-shadow(0 20px 40px rgba(0,0,0,.45));
  transition: transform .12s ease-out, opacity .12s ease-out;
  position: relative;
  z-index: 2; /* devant la bande de fondu */
}

/* Bande de fondu (transition douce vers les articles) */
.hero-fade{
  position:absolute; inset:auto 0 0 0;
  height: 18vh; /* court et net ; tu peux pousser à 22vh si tu veux plus de fondu */
  background: linear-gradient(
    180deg,
    rgba(10,15,20,0) 0%,
    rgba(10,15,20,0.55) 40%,
    rgba(10,15,20,0.80) 75%,
    var(--bg) 100%
  );
  pointer-events:none;
  z-index: 1;
}

/* Séparation structurelle : évite le chevauchement au repos */
#hero-spacer{
  height: 12vh;      /* Espace réel (desktop) — réduit mais sûr */
  z-index: 5;
  position: relative;
}
@media (max-width: 768px){
  #hero-spacer{ height: 16vh; } /* Mobile : un peu plus d’air car zoom plus fort en JS */
}

/* La liste est sous le HERO (mais démarre après le spacer, donc pas masquée) */
.list{ position: relative; z-index: 10; }

/* ========================================================================
   Accessibilité / préférences
   ======================================================================== */
@media (prefers-reduced-motion: reduce){
  .hero-logo{ transition:none !important; }
  .card{ transition:none !important; opacity:1 !important; transform:none !important; }
}
