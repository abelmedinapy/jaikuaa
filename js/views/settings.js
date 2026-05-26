import { CATEGORY_COLOR, CATEGORY_LABEL, meta, dailyItem, allItems } from '../data.js';
import { clearFavs, clearFilters, getState, setFilters } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../app.js';
import { requestTiltPermission, isTiltActive } from '../utils/holo-tilt.js';

const sheet = () => document.getElementById('sheet');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function renderActiveFilters() {
  const { filters } = getState();
  if (!filters.categories.length && !filters.tierAOnly) {
    return `<div class="mono" style="color:var(--fg-tertiary); font-size:0.8rem">Sin filtros activos</div>`;
  }
  const chips = filters.categories.map((c) => `
    <button class="chip is-active" data-action="settings-remove-cat" data-cat="${c}" style="--cat-color:${CATEGORY_COLOR[c]}">
      <span class="chip-dot" style="--cat-color:${CATEGORY_COLOR[c]}"></span>${escapeHtml(CATEGORY_LABEL[c])} ×
    </button>
  `).join('');
  const tier = filters.tierAOnly ? `<button class="chip is-active" data-action="settings-remove-tier" style="--cat-color:var(--accent-yellow)"><span class="chip-dot" style="--cat-color:var(--accent-yellow)"></span>Tier A ×</button>` : '';
  return `<div class="active-filters">${chips}${tier}</div>`;
}

async function getSWVersion() {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return null;
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    let done = false;
    ch.port1.onmessage = (e) => { if (done) return; done = true; resolve((e.data && e.data.version) || null); };
    try { navigator.serviceWorker.controller.postMessage({ type: 'VERSION' }, [ch.port2]); } catch { resolve(null); }
    setTimeout(() => { if (!done) { done = true; resolve(null); } }, 800);
  });
}

export async function openSettings() {
  const m = meta() || { total: '?', version: '1.0.0' };
  const { filters, installPrompt } = getState();
  const swV = await getSWVersion();
  const swLabel = swV ? swV.replace('jaikuaa-v', '') : 'sin SW';
  const el = sheet();
  el.innerHTML = `
    <div class="sheet-inner" role="dialog" aria-label="Ajustes">
      <button class="sheet-handle" data-action="sheet-close" aria-label="Cerrar"></button>
      <button class="sheet-close" data-action="sheet-close" aria-label="Cerrar ajustes" title="Cerrar">×</button>
      <h2 class="sheet-title">Tus ajustes</h2>

      <div class="settings-section">
        <div class="settings-row">
          <div>
            <div class="label">Filtros activos</div>
            <div class="hint">Afectan al random y a la búsqueda.</div>
          </div>
          <button class="btn" data-action="settings-clear-filters">Limpiar</button>
        </div>
        ${renderActiveFilters()}
      </div>

      <div class="settings-section">
        <div class="settings-row">
          <div>
            <div class="label">Solo Tier A</div>
            <div class="hint">Mostrar únicamente los 141 destacados.</div>
          </div>
          <button class="toggle ${filters.tierAOnly ? 'on' : ''}" data-action="settings-toggle-tier" role="switch" aria-checked="${filters.tierAOnly}"></button>
        </div>
      </div>

      <div class="settings-section">
        <button class="btn is-block" data-action="settings-daily">Tarjeta del día</button>
        ${isTiltActive() ? '' : `<button class="btn is-block" data-action="settings-tilt" style="margin-top:var(--sp-3)">Activar movimiento del celular</button>`}
        ${installPrompt ? `<button class="btn is-block" data-action="settings-install" style="margin-top:var(--sp-3)">Instalar como app</button>` : ''}
        <button class="btn is-block" data-action="settings-about" style="margin-top:var(--sp-3)">Sobre Jaikuaa</button>
        <button class="btn is-block is-danger" data-action="settings-clear-favs" style="margin-top:var(--sp-3)">Borrar mis favoritos</button>
      </div>

      <div class="settings-footer">app v${swLabel} · datos v${m.version || '?'} · ${(m.total || 0).toLocaleString('es')} tarjetas · hecho con ❤︎ en Asunción</div>
    </div>
  `;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('open'));
}

export function closeSettings() {
  const el = sheet();
  el.classList.remove('open');
  setTimeout(() => {
    el.hidden = true;
    el.innerHTML = '';
    if (window.location.hash === '#/settings') history.replaceState(null, '', '#/');
  }, 200);
}

function openAbout() {
  const el = sheet();
  el.innerHTML = `
    <div class="sheet-inner" role="dialog" aria-label="Sobre Jaikuaa">
      <button class="sheet-handle" data-action="sheet-close" aria-label="Cerrar"></button>
      <button class="sheet-close" data-action="sheet-close" aria-label="Cerrar" title="Cerrar">×</button>
      <h2 class="sheet-title serif italic">Jaikuaa</h2>
      <p style="color:var(--fg-secondary); line-height:1.7">
        <span class="serif italic">Jaikuaa</span> significa <em>conozcamos</em> o <em>sabemos</em> en guaraní inclusivo. La forma <span class="serif italic">ja-</span> incluye a quien lee en la acción.
      </p>
      <p style="color:var(--fg-secondary); line-height:1.7; margin-top:var(--sp-4)">
        Una postal nocturna del Paraguay: 2940 tarjetas curadas sobre lugares, naturaleza, idioma, cultura, comida, personajes, historia, leyendas y vida cotidiana. No es Wikipedia. Es un <em>descubridor poético</em> para abrir cada día.
      </p>
      <p class="mono" style="color:var(--fg-tertiary); font-size:0.75rem; margin-top:var(--sp-5); line-height:1.6">
        Curaduría: AMPOST · Licencia CC BY-SA 4.0 · Diseñado en Asunción · 2026
      </p>
      <button class="btn is-block" data-action="sheet-close" style="margin-top:var(--sp-5)">Cerrar</button>
    </div>
  `;
}

export function handleSettingsAction(action, target) {
  if (action === 'settings-clear-filters') { clearFilters(); openSettings(); return true; }
  if (action === 'settings-toggle-tier')   { setFilters({ tierAOnly: !getState().filters.tierAOnly }); openSettings(); return true; }
  if (action === 'settings-remove-cat')    {
    const cats = getState().filters.categories.filter((c) => c !== target.dataset.cat);
    setFilters({ categories: cats });
    openSettings(); return true;
  }
  if (action === 'settings-remove-tier')   { setFilters({ tierAOnly: false }); openSettings(); return true; }
  if (action === 'settings-daily')         {
    const it = dailyItem(allItems());
    if (it) { closeSettings(); navigate('card', it.id); }
    return true;
  }
  if (action === 'settings-install')       {
    const p = getState().installPrompt;
    if (p && p.prompt) { p.prompt(); }
    return true;
  }
  if (action === 'settings-tilt')          {
    requestTiltPermission().then((r) => {
      if (r === 'granted') { showToast('Movimiento activado ✓'); closeSettings(); }
      else if (r === 'denied') showToast('Permiso rechazado');
      else showToast('Este dispositivo no lo soporta');
    });
    return true;
  }
  if (action === 'settings-about')         { openAbout(); return true; }
  if (action === 'settings-clear-favs')    {
    if (confirm('¿Seguro que querés borrar todos tus favoritos? No hay vuelta atrás.')) {
      clearFavs();
      showToast('Listo, cajón vacío');
      openSettings();
    }
    return true;
  }
  if (action === 'sheet-close')            { closeSettings(); return true; }
  return false;
}
