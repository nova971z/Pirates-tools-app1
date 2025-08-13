:root {
  --bg: #0a0f14;
  --fg: #fff;
  --border: rgba(255,255,255,0.08);
}

/* ===== Base ===== */
body {
  margin: 0;
  color: var(--fg);
  background: linear-gradient(180deg, #0a0f14 0%, #061a20 40%, #0a0f14 100%);
  font-family: system-ui, -apple-system, "Inter", Segoe UI, Roboto, Arial, sans-serif;
  line-height: 1.7;
  letter-spacing: .2px;
}

/* ===== Topbar ===== */
.topbar {
  position: sticky;
  top: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .6rem .9rem;
  background: rgba(10, 15, 20, .72);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.logo-text {
  font-weight: bold;
  font-size: 1.2rem;
}

.contact-links a {
  color: var(--fg);
  text-decoration: none;
  margin-left: 1rem;
}

/* ===== Hero ===== */
.scene {
  pointer-events: none;
}

.hero-full {
  position: fixed;
  inset: 0;
  height: 100vh;
  z-index: 2000;
  background:
    radial-gradient(60% 40% at 50% 30%, rgba(25, 211, 255, .06), transparent),
    linear-gradient(180deg, transparent 0%, transparent 60%, transparent 100%);
}

.hero-logo {
  display: block;
  margin: 0 auto;
  max-width: 85vw;
  will-change: transform, opacity;
  transform-origin: center center;
  filter: drop-shadow(0 20px 40px rgba(0, 0, 0, .45));
  transition: transform .12s ease-out, opacity .12s ease-out;
}

@media (max-width: 768px) {
  .hero-logo {
    max-width: 92vw;
  }
}

.hero-fade {
  position: absolute;
  inset: auto 0 0 0;
  height: 30vh;
  background: linear-gradient(180deg, transparent, rgba(10, 15, 20, .75), var(--bg));
}

/* ===== Articles ===== */
.articles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding: 2rem;
}

.card {
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 8px;
  opacity: 0;
  transform: translateY(14px);
  transition: opacity .28s ease, transform .28s ease;
}
.card.is-in {
  opacity: 1;
  transform: none;
}

/* ===== Skeleton ===== */
.sk { border-radius: 8px; background: linear-gradient(90deg, #0e151c 0%, #17202a 20%, #0e151c 40%); background-size: 200% 100%; animation: sk 1.2s linear infinite; }
.sk-title { width: 40%; height: 18px; }
.sk-btn { width: 70px; height: 28px; }
.sk-media { width: 100%; height: 160px; border-radius: 10px; }
.sk-chip { width: 80px; height: 24px; display: inline-block; }
.sk-text { width: 100%; height: 14px; margin-top: 8px; }
@keyframes sk { to { background-position: -200% 0; } }

/* ===== Boutons rapides mobile ===== */
.quick-actions {
  position: fixed;
  right: 14px;
  bottom: 16px;
  z-index: 3500;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.qa-btn {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  text-decoration: none;
  font-weight: 900;
  border: 1px solid var(--border);
  box-shadow: 0 10px 24px rgba(0,0,0,.35), 0 0 0 2px rgba(255,255,255,.06) inset;
}
.qa-wa { background: linear-gradient(180deg,#25D366,#128C7E); color: #001014; }
.qa-tel { background: linear-gradient(180deg,#19d3ff,#00ffa7); color: #001018; }

@media (min-width: 821px) {
  .quick-actions { display: none; }
}
