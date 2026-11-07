/* TUCO Post Studio — site behaviour. No dependencies. */
(() => {
  'use strict';

  // Paste the account URL here when it exists and the footer link appears.
  const INSTAGRAM_URL = '';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const conn = navigator.connection || {};
  const saveData = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');

  /* ── Mexico City clock ─────────────────────────────────────────── */
  const clocks = $$('[data-clock]');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' });
  const tick = () => { const t = fmt.format(new Date()); clocks.forEach(c => { c.textContent = t; }); };
  tick(); setInterval(tick, 15000);
  $$('[data-year]').forEach(y => { y.textContent = new Date().getFullYear(); });

  if (INSTAGRAM_URL) {
    const ig = $('[data-instagram]');
    if (ig) { ig.hidden = false; ig.querySelector('a').href = INSTAGRAM_URL; }
  }

  /* ── Header: solid on scroll, mobile menu, active section ──────── */
  const hd = $('[data-hd]');
  const toggle = $('.hd__toggle');
  const onScroll = () => hd.classList.toggle('is-solid', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const setMenu = (open) => {
    hd.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
  };
  toggle.addEventListener('click', () => setMenu(!hd.classList.contains('is-open')));
  $$('.hd__nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && hd.classList.contains('is-open')) setMenu(false); });

  const navLinks = new Map($$('.hd__nav a').map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const a = navLinks.get(en.target.id);
      if (a && en.isIntersecting) { navLinks.forEach(l => l.removeAttribute('aria-current')); a.setAttribute('aria-current', 'true'); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  /* ── Manifesto: every line set to the full measure (justified stack) ── */
  const fit = $('[data-fit]');
  if (fit) {
    const lines = $$('.line', fit);
    const doFit = () => {
      const w = fit.clientWidth;
      lines.forEach(l => { l.style.fontSize = '100px'; });
      lines.forEach(l => { l.style.fontSize = `${(100 * w / l.scrollWidth).toFixed(2)}px`; });
      fit.classList.add('is-fit');
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(doFit);
    new ResizeObserver(doFit).observe(fit);
  }

  /* ── Timecode helpers ──────────────────────────────────────────── */
  const FPS = 24;
  const pad = n => String(n).padStart(2, '0');
  const toTC = s => {
    const f = Math.floor((s % 1) * FPS), t = Math.floor(s);
    return `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}:${pad(f)}`;
  };

  /* ── Hero reel ─────────────────────────────────────────────────── */
  const hero = $('[data-hero]');
  const tcEl = $('[data-tc]');
  if (hero) {
    const small = matchMedia('(max-width: 760px)').matches;
    const src = small ? hero.dataset.srcSm : hero.dataset.srcLg;
    let raf = 0;
    const loopTC = () => { tcEl.textContent = toTC(hero.currentTime || 0); raf = requestAnimationFrame(loopTC); };
    if (!reduceMotion && !saveData) {
      hero.src = src;
      hero.preload = 'auto';
      hero.play().catch(() => {});
      new IntersectionObserver(([en]) => {
        if (en.isIntersecting) { hero.play().catch(() => {}); cancelAnimationFrame(raf); raf = requestAnimationFrame(loopTC); }
        else { hero.pause(); cancelAnimationFrame(raf); }
      }, { threshold: 0.05 }).observe(hero);
    }
  }

  /* ── Work cards: poster first, preview loop on hover / in view ──── */
  const cards = $$('[data-work] .card');
  const startPreview = (card) => {
    const v = $('video', card);
    if (!v || reduceMotion || saveData) return;
    if (!v.src) { v.src = v.dataset.preview; }
    const p = v.play();
    if (p) p.then(() => card.classList.add('is-playing')).catch(() => {});
  };
  const stopPreview = (card) => {
    const v = $('video', card);
    if (!v || !v.src) return;
    v.pause(); card.classList.remove('is-playing');
  };

  if (finePointer) {
    cards.forEach(card => {
      const hit = $('.card__hit', card);
      hit.addEventListener('pointerenter', () => startPreview(card));
      hit.addEventListener('pointerleave', () => stopPreview(card));
      hit.addEventListener('focus', () => startPreview(card));
      hit.addEventListener('blur', () => stopPreview(card));
    });
  } else {
    // Touch: the card that is mostly on screen plays, the rest rest.
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => (en.intersectionRatio > 0.6 ? startPreview : stopPreview)(en.target));
    }, { threshold: [0, 0.6, 1] });
    cards.forEach(c => io.observe(c));
  }

  /* ── Film strip: load + play only while visible ────────────────── */
  const strip = $('[data-strip]');
  if (strip) {
    // Duplicate the set once so the CSS loop is seamless.
    const set = $('.strip__set', strip);
    set.after(set.cloneNode(true));
    const vids = $$('video', strip);
    new IntersectionObserver(([en]) => {
      vids.forEach(v => {
        if (en.isIntersecting && !reduceMotion && !saveData) {
          if (!v.src) v.src = v.dataset.stripSrc;
          v.play().catch(() => {});
        } else if (v.src) v.pause();
      });
    }, { rootMargin: '200px 0px' }).observe(strip);
  }

  /* ── Lazy decorative loops (stop-motion ident) ─────────────────── */
  const lazyLoops = $$('[data-lazy-src]');
  if (lazyLoops.length && !reduceMotion && !saveData) {
    const lio = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const v = en.target;
        if (en.isIntersecting) { if (!v.src) v.src = v.dataset.lazySrc; v.play().catch(() => {}); }
        else if (v.src) v.pause();
      });
    }, { rootMargin: '150px 0px' });
    lazyLoops.forEach(v => lio.observe(v));
  }

  /* ── Custom cursor over work ───────────────────────────────────── */
  const cursor = $('[data-cursor]');
  if (finePointer && cursor) {
    const label = $('[data-cursor-label]', cursor);
    let x = -100, y = -100, cx = x, cy = y, on = false, raf = 0;
    const move = () => {
      cx += (x - cx) * 0.28; cy += (y - cy) * 0.28;
      cursor.style.transform = `translate3d(${cx + 14}px, ${cy + 14}px, 0)`;
      raf = (Math.abs(x - cx) + Math.abs(y - cy) > 0.3 || on) ? requestAnimationFrame(move) : 0;
    };
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(move); }, { passive: true });
    cards.forEach(card => {
      const hit = $('.card__hit', card);
      const tc = $('.card__tc', card);
      hit.addEventListener('pointerenter', () => {
        on = true; label.textContent = `Play  ${tc ? tc.textContent.replace(/^00:/, '') : ''}`;
        cursor.classList.add('is-on'); if (!raf) raf = requestAnimationFrame(move);
      });
      hit.addEventListener('pointerleave', () => { on = false; cursor.classList.remove('is-on'); });
    });
  }

  /* ── Player (native <dialog>: focus trap + Esc for free) ───────── */
  const dlg = $('[data-player]');
  const pv = $('[data-player-video]');
  const pTitle = $('[data-player-title]');
  const pSub = $('[data-player-sub]');
  const pN = $('[data-player-n]');
  const pCredits = $('[data-player-credits]');
  const items = cards.map(c => $('.card__hit', c));
  let idx = -1, opener = null;

  const load = (btn, i) => {
    idx = i;
    pv.poster = btn.dataset.poster || ($('img', btn) ? $('img', btn).currentSrc : '');
    pv.src = btn.dataset.src;
    pTitle.textContent = btn.dataset.title || '';
    pSub.textContent = btn.dataset.sub || '';
    pN.textContent = i >= 0 ? `${pad(i + 1)} / ${pad(items.length)}` : 'Reel';
    pCredits.textContent = btn.dataset.credits || 'Post-production — TUCO Post Studio';
    $('[data-player-prev]').hidden = $('[data-player-next]').hidden = i < 0;
    pv.muted = false;
    pv.play().catch(() => {});
  };
  const open = (btn, i) => {
    opener = btn;
    cards.forEach(stopPreview);
    if (hero && !hero.paused) hero.pause();
    load(btn, i);
    dlg.showModal();
    document.body.classList.add('is-locked');
  };
  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('close', () => {
    pv.pause(); pv.removeAttribute('src'); pv.load();
    document.body.classList.remove('is-locked');
    if (hero && hero.src && !reduceMotion) hero.play().catch(() => {});
    if (opener) opener.focus({ preventScroll: true });
  });
  const step = d => { if (idx >= 0) load(items[(idx + d + items.length) % items.length], (idx + d + items.length) % items.length); };

  items.forEach((btn, i) => btn.addEventListener('click', () => open(btn, i)));
  const reelBtn = $('[data-play-reel]');
  if (reelBtn) reelBtn.addEventListener('click', () => open(reelBtn, -1));
  $('[data-player-close]').addEventListener('click', close);
  $('[data-player-prev]').addEventListener('click', () => step(-1));
  $('[data-player-next]').addEventListener('click', () => step(1));
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.classList.contains('player__stage')) close(); });
  dlg.addEventListener('keydown', e => {
    if (e.target === pv) return; // let the native player seek with the arrows
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  /* ── Reveal on scroll ──────────────────────────────────────────── */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const rv = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); rv.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach(el => rv.observe(el));
  } else {
    $$('[data-reveal]').forEach(el => el.classList.add('is-in'));
  }
})();
