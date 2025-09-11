/* =========================================================
   6B — MENU A11y avancé (open/close + focus trap + actif)
   Expose PT.menu { open, close, isOpen, setActive, wire }
   ES5-safe, idempotent
========================================================= */
(function menuA11y(){
  'use strict';
  var W=window, D=document, PT=(W.PT=W.PT||{});

  if (W.__ptP6BNav!==1) W.__ptP6BNav = 1;

  function $(s,r){ try{ return (r||D).querySelector(s); }catch(_){ return null; } }
  function $$(s,r){ try{ return Array.prototype.slice.call((r||D).querySelectorAll(s)); }catch(_){ return []; } }
  function on(el,ev,fn){ if(!el) return; var k='__ptOn_'+ev; if(el[k]) return; el[k]=1; el.addEventListener(ev,fn,false); }
  function announce(msg){ try{ if(W.announce) W.announce(msg); }catch(_){ } }
  function log(){ try{ if(W.console&&console.log) console.log.apply(console,arguments); }catch(_){ } }

  var body=D.body, drawer, topnav, toggle, backdrop;
  var FSEL=['a[href]','button:not([disabled])','input:not([disabled])','select:not([disabled])','textarea:not([disabled])','[tabindex]:not([tabindex="-1"])'].join(',');

  function resolveNodes(){
    drawer   = $('#drawer') || $('#sideMenu') || $('#side-menu') || $('.drawer') || $('[data-drawer]');
    topnav   = $('#topbar') || $('.topbar') || $('nav[role="navigation"]') || $('nav');
    toggle   = $('#menuBtn') || $('#menu-toggle') || $('.hamburger') || $('.menu-toggle') || $('[data-menu-toggle]');
    backdrop = $('#drawerBackdrop') || $('#menuBackdrop') || $('.drawer__backdrop') || $('.backdrop') || $('#menu-overlay');
  }
  resolveNodes();

  function isOpen(){
    return (!!drawer && drawer.classList && (drawer.classList.contains('open')||drawer.classList.contains('is-open')||drawer.classList.contains('active')))
        || (!!body && body.classList && body.classList.contains('menu-open'));
  }

  function setAriaOpen(open){
    try{
      if (toggle){
        toggle.setAttribute('role','button');
        toggle.setAttribute('aria-expanded', open?'true':'false');
        toggle.setAttribute('aria-label', open?'Fermer le menu':'Ouvrir le menu');
        if (drawer && drawer.id) toggle.setAttribute('aria-controls', drawer.id);
      }
      if (drawer){
        if (!drawer.getAttribute('role')) drawer.setAttribute('role','dialog');
        drawer.setAttribute('aria-modal','true');
        drawer.setAttribute('aria-hidden', open?'false':'true');
      }
      if (backdrop){
        backdrop.setAttribute('aria-hidden', open?'false':'true');
        if (open){ backdrop.classList && backdrop.classList.remove('hidden'); backdrop.style.display=''; }
        else { backdrop.classList && backdrop.classList.add('hidden'); backdrop.style.display='none'; }
      }
    }catch(_){}
  }

  function lockScroll(onFlag){ try{ if(!body) return; if(onFlag) body.classList.add('menu-open'); else body.classList.remove('menu-open'); }catch(_){ } }

  function focusFirst(){
    try{
      var list=$$(FSEL, drawer);
      var first=list[0] || drawer || toggle;
      if(first){ if(first===drawer && !drawer.hasAttribute('tabindex')) drawer.setAttribute('tabindex','-1'); first.focus(); }
    }catch(_){}
  }

  function open(){ if(!drawer) return; drawer.classList.add('open'); lockScroll(true); setAriaOpen(true); focusFirst(); announce('Menu ouvert'); wireTrap(); log('[P6B] open'); }
  function close(){ if(!drawer) return; drawer.classList.remove('open'); drawer.classList.remove('is-open'); drawer.classList.remove('active'); lockScroll(false); setAriaOpen(false); try{toggle&&toggle.focus&&toggle.focus();}catch(_){ } announce('Menu fermé'); log('[P6B] close'); }

  function wireTrap(){
    if(!drawer || drawer.__ptTrap) return; drawer.__ptTrap=1;
    on(drawer,'keydown',function(e){
      if(!isOpen()) return;
      var k=e.key||e.keyCode;
      if(k==='Escape'||k===27){ e.preventDefault(); close(); return; }
      if(!(k==='Tab'||k===9)) return;
      try{
        var list=$$(FSEL, drawer); if(!list.length) return;
        var first=list[0], last=list[list.length-1], active=D.activeElement, shift=!!e.shiftKey;
        var inside = drawer.contains(active);
        if(shift && (!inside || active===first)){ e.preventDefault(); last.focus(); }
        else if(!shift && (!inside || active===last)){ e.preventDefault(); first.focus(); }
      }catch(_){}
    });
    on(D,'keydown',function(e){ var k=e.key||e.keyCode; if(!isOpen()) return; if(k==='Escape'||k===27){ e.preventDefault(); close(); } });
  }

  function wireToggles(){
    if(toggle && !toggle.__pt6B){ toggle.__pt6B=1;
      toggle.setAttribute('aria-expanded','false');
      on(toggle,'click',function(e){ e.preventDefault(); isOpen()?close():open(); });
      on(toggle,'pointerup',function(e){ if(e&&e.pointerType==='touch'){ e.preventDefault(); isOpen()?close():open(); } });
    }
    if(backdrop && !backdrop.__pt6B){ backdrop.__pt6B=1; on(backdrop,'click',function(){ close(); }); }
    if(drawer && !drawer.__pt6BLinks){ drawer.__pt6BLinks=1;
      on(drawer,'click',function(e){ var a=e.target&&e.target.closest?e.target.closest('a,[role="menuitem"],[data-route]'):null; if(a) setTimeout(close,30); });
    }
  }
  wireToggles();

  (function wireRovingTopbar(){
    if(!topnav || topnav.__ptRoving) return; topnav.__ptRoving=1;
    on(topnav,'keydown',function(e){
      var k=e.key||e.keyCode;
      if(!(k==='ArrowRight'||k===39||k==='ArrowLeft'||k===37||k==='Home'||k===36||k==='End'||k===35)) return;
      var links=$$(FSEL, topnav).filter(function(el){ return el && (el.tagName==='A' || el.getAttribute('role')==='menuitem' || el.hasAttribute('tabindex')); });
      if(!links.length) return;
      var idx=Math.max(0, links.indexOf(D.activeElement));
      if(k==='ArrowRight'||k===39) idx=(idx+1)%links.length;
      else if(k==='ArrowLeft'||k===37) idx=(idx-1+links.length)%links.length;
      else if(k==='Home'||k===36) idx=0;
      else if(k==='End'||k===35) idx=links.length-1;
      try{ links[idx].focus(); }catch(_){}
    });
  })();

  function mapRouteToKey(href){
    var h=href||(W.location&&W.location.hash)||'#/';
    if(!h || h==='#') h='#/';
    if(h.indexOf('#/produit/')===0) return '#/catalogue';
    if(h.indexOf('#/home')===0 || h==='#/') return '#/';
    if(h.indexOf('#/catalogue')===0) return '#/catalogue';
    if(h.indexOf('#/devis')===0) return '#/devis';
    if(h.indexOf('#/compte')===0) return '#/compte';
    return '';
  }
  function markActive(){
    var cur=mapRouteToKey(), scopes=[drawer,topnav], s,i;
    for(s=0;s<scopes.length;s++){ var host=scopes[s]; if(!host) continue;
      var links=$$('a[href^="#/"]',host).concat($$('[data-route^="#/"]',host));
      for(i=0;i<links.length;i++){ var href=links[i].getAttribute('href')||links[i].getAttribute('data-route')||''; var ok=(mapRouteToKey(href)===cur && cur);
        if(ok){ links[i].setAttribute('aria-current','page'); links[i].classList.add('is-active'); }
        else { links[i].removeAttribute('aria-current'); links[i].classList.remove('is-active'); }
      }
    }
    if(cur) announce('Lien actif mis à jour'); log('[P6B] active →',cur);
  }
  function toggleFabAccount(){ var fab=$('#fabAccount'); if(!fab) return; var cur=mapRouteToKey(); fab.style.display=(cur==='#/compte')?'none':''; }

  on(W,'hashchange',function(){ setTimeout(close,0); markActive(); toggleFabAccount(); });

  setAriaOpen(isOpen()); markActive(); toggleFabAccount(); wireTrap();

  PT.menu=PT.menu||{};
  PT.menu.open=open; PT.menu.close=close; PT.menu.isOpen=isOpen;
  PT.menu.setActive=function(route){ try{ if(route) W.location.hash=route; }catch(_){ } markActive(); };
  PT.menu.wire=function(){ resolveNodes(); setAriaOpen(isOpen()); wireToggles(); markActive(); toggleFabAccount(); wireTrap(); };
})();