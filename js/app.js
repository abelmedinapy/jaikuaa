// Bootstrap, routing, global event delegation.
import { loadData } from './data.js';
import { defineRoute, navigate, startRouter, currentRoute } from './router.js';
import { getState, incVisits, setState, subscribe, toggleFav } from './store.js';
import { inflateIcons } from './utils/icons.js';
import { storage } from './utils/storage.js';

// Views
import { copyCurrent, getCurrentEntry, nextRandom, navHistory, renderRoute as renderCard, setupCardInteractions } from './views/card.js';
import { renderRoute as renderSearch, handleSearchAction } from './views/search.js';
import { renderRoute as renderFavorites } from './views/favorites.js';
import { renderRoute as renderMap } from './views/map.js';
import { openSettings, closeSettings, handleSettingsAction } from './views/settings.js';

import { shareCard } from './utils/share.js';

// ---- Toast ----
let toastTimer = null;
export function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

// ---- Boot ----
async function boot() {
  inflateIcons(document);
  incVisits();
  bindGlobalListeners();
  bindServiceWorker();
  bindInstallPrompt();
  bindOnlineStatus();

  try {
    await loadData();
    setState({ ready: true });
    hideSplash();
    document.getElementById('nav').hidden = false;
    defineRoutes();
    startRouter();
    maybeShowSwipeHint();
  } catch (err) {
    console.error(err);
    showFatal(err.message || 'Error al cargar el dataset.');
  }
}

// One-time onboarding hint
function maybeShowSwipeHint() {
  const seen = storage.get('hint_seen_v2', false);
  if (seen) return;
  const cur = currentRoute();
  if (cur.name !== '' && cur.name !== 'card') return;
  const el = document.getElementById('swipe-hint');
  if (!el) return;
  setTimeout(() => {
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    const dismiss = () => {
      el.classList.remove('show');
      setTimeout(() => { el.hidden = true; }, 300);
      storage.set('hint_seen_v2', true);
      document.removeEventListener('touchstart', dismiss);
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
    setTimeout(dismiss, 3500);
    document.addEventListener('touchstart', dismiss, { once: true, passive: true });
    document.addEventListener('mousedown', dismiss, { once: true });
    document.addEventListener('keydown', dismiss, { once: true });
  }, 800);
}

function hideSplash() {
  const s = document.getElementById('splash');
  if (!s) return;
  s.classList.add('fade-out');
  setTimeout(() => { s.hidden = true; }, 400);
}

function showFatal(msg) {
  const root = document.getElementById('view');
  root.innerHTML = `
    <div class="fullscreen-msg">
      <h1>Algo salió mal</h1>
      <p>${msg}</p>
      <p style="color:var(--fg-tertiary); font-size:0.85rem">La primera vez Jaikuaa necesita internet para bajar las 2.940 tarjetas. Después corre sin conexión, prometido.</p>
      <button class="btn" onclick="location.reload()">Probar de nuevo</button>
    </div>
  `;
  hideSplash();
}

// ---- Routes ----
function closeSheetIfOpen() { const el = document.getElementById('sheet'); if (el && !el.hidden) closeSettings(); }
function defineRoutes() {
  defineRoute('',          (ctx) => { closeSheetIfOpen(); highlightNav(''); renderCard(ctx); });
  defineRoute('card',      (ctx) => { closeSheetIfOpen(); highlightNav(''); renderCard(ctx); });
  defineRoute('search',    ()    => { closeSheetIfOpen(); highlightNav('search'); renderSearch(); });
  defineRoute('favorites', ()    => { closeSheetIfOpen(); highlightNav('favorites'); renderFavorites(); });
  defineRoute('map',       ()    => { closeSheetIfOpen(); highlightNav('map'); renderMap(); });
  defineRoute('settings',  ()    => { highlightNav('settings'); openSettings(); });
}

function highlightNav(active) {
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('is-active', (b.dataset.route || '') === active);
  });
}

// ---- Global event delegation ----
function bindGlobalListeners() {
  const root = document.body;

  root.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) {
      // Close sheet on backdrop
      const sheetEl = document.getElementById('sheet');
      if (sheetEl && !sheetEl.hidden && e.target === sheetEl) closeSettings();
      return;
    }
    const action = target.dataset.action;

    if (action === 'route') {
      const route = target.dataset.route || '';
      // If clicking same route as current AND it's home → force new random
      const cur = currentRoute();
      if (route === '' && cur.name === '') { nextRandom(); return; }
      navigate(route);
      return;
    }

    if (action === 'next-card') {
      // Ignore taps on actions / metadata children that already handled themselves
      if (e.target.closest('[data-action]') !== target) return;
      nextRandom();
      return;
    }

    if (action === 'discover-next') {
      nextRandom();
      return;
    }

    if (action === 'prev-card') {
      navHistory(-1);
      return;
    }

    if (action === 'filter-by-cat') {
      // Single-category quick filter
      const cat = target.dataset.cat;
      const cur = getState().filters.categories;
      const next = cur.length === 1 && cur[0] === cat ? [] : [cat];
      setState({ filters: { ...getState().filters, categories: next } });
      showToast(next.length ? `Filtro: ${cat}` : 'Sin filtro de categoría');
      navigate('search');
      return;
    }

    if (action === 'fav') {
      const card = target.closest('.card');
      if (!card) return;
      const id = card.dataset.id;
      const now = toggleFav(id);
      target.classList.toggle('is-fav', now);
      target.innerHTML = now
        ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.5 6 .7-4.5 4.2 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.2l6-.7L12 3z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.5 6 .7-4.5 4.2 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.2l6-.7L12 3z"/></svg>';
      showToast(now ? 'Guardada en favoritos ★' : 'Sacada de favoritos');
      return;
    }

    if (action === 'share') {
      const entry = getCurrentEntry();
      if (!entry) return;
      showToast('Armando la imagen…');
      try {
        const res = await shareCard(entry);
        if (res === 'shared') showToast('Compartido');
        else if (res === 'link-and-png') showToast('Enlace copiado · PNG en descargas');
        else if (res === 'downloaded') showToast('PNG en descargas');
      } catch (err) {
        showToast('No se pudo compartir — perdón');
        console.error(err);
      }
      return;
    }

    if (action === 'copy') {
      await copyCurrent();
      return;
    }

    if (action === 'open-card') {
      navigate('card', target.dataset.id);
      return;
    }

    if (handleSearchAction(action, target)) return;
    if (handleSettingsAction(action, target)) return;
  });

  // Keyboard nav
  window.addEventListener('keydown', (e) => {
    // Ignore when typing
    if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
    const cur = currentRoute();
    if (cur.name !== '' && cur.name !== 'card') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); navHistory(1); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); navHistory(-1); }
    else if (e.code === 'Space') { e.preventDefault(); nextRandom(); }
  });

  // Card-stage touch + contextmenu
  setupCardInteractions(document.body);

  // Subscribe: when filters change, refresh nav highlight (no-op here mostly)
  subscribe(() => { /* hook for future reactive UI */ });
}

// ---- Service worker (auto-update sin fricción) ----
function bindServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  let reloaded = false;
  let updateToastShown = false;
  // Si NO había controller al inicio, la primera activación es la instalación
  // inicial — no es un update y no debe disparar reload.
  let ignoreNextControllerChange = !navigator.serviceWorker.controller;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('service-worker.js');
      // Check periódico cada 5 min mientras la pestaña está abierta
      setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);
      // Check al volver a la pestaña
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => {});
      });
    } catch (err) { console.warn('SW register failed', err); }
  });

  // Cuando un nuevo SW toma control, decidir cómo aplicar
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (ignoreNextControllerChange) { ignoreNextControllerChange = false; return; }
    if (reloaded) return;
    reloaded = true;
    if (document.hidden) {
      location.reload();
    } else if (!updateToastShown) {
      updateToastShown = true;
      showUpdateAvailable();
    }
  });
}

function showUpdateAvailable() {
  const t = document.getElementById('toast');
  if (!t) { location.reload(); return; }
  t.innerHTML = `Hay una versión nueva <button class="toast-action" type="button">actualizar</button>`;
  t.classList.add('show');
  let applied = false;
  const apply = () => { if (applied) return; applied = true; location.reload(); };
  t.querySelector('.toast-action').addEventListener('click', apply);
  // Auto-apply after 12s — siempre se actualiza, sin perderte updates
  setTimeout(apply, 12000);
}

// ---- Install prompt ----
function bindInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setState({ installPrompt: e });
  });
  window.addEventListener('appinstalled', () => {
    setState({ installPrompt: null });
    showToast('Bienvenido a Jaikuaa ★');
  });
}

// ---- Online status ----
function bindOnlineStatus() {
  const dot = document.getElementById('offline-dot');
  const update = () => {
    const online = navigator.onLine;
    setState({ online });
    if (dot) dot.hidden = online;
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

boot();
