// CardView: el corazón de Jaikuaa.
import { byId, CATEGORY_COLOR, CATEGORY_LABEL, filterItems, randomItem, tierAItems } from '../data.js';
import { getState, isFav, pushHistory, toggleFav, historyPrev, historyNext } from '../store.js';
import { ICONS } from '../utils/icons.js';
import { showToast } from '../app.js';

const view = () => document.getElementById('view');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function renderCardHTML(entry) {
  const cat = entry.category;
  const color = CATEGORY_COLOR[cat] || 'var(--fg-tertiary)';
  const isGuarani = cat === 'idioma';
  const fav = isFav(entry.id);
  const yearHtml = entry.year ? `<span class="card-title-year">${entry.year}</span>` : '';
  const subtitleHtml = entry.subtitle ? `<p class="card-subtitle">${escapeHtml(entry.subtitle)}</p>` : '';
  const bodyHtml = entry.body ? `<p class="card-body">${escapeHtml(entry.body)}</p>` : '';
  const tierHtml = entry.tier === 'A' ? `<span class="card-tier-badge" title="Destacado" aria-label="Destacado">★</span>` : '';
  const subLabel = entry.subcategory_label || entry.subcategory || '';

  return `
    <article class="card" data-id="${entry.id}" style="--cat-color:${color};" data-action="next-card">
      <div class="card-hero">
        <h1 class="card-title ${isGuarani ? 'is-guarani' : ''}">${escapeHtml(entry.title)}${yearHtml}</h1>
        ${subtitleHtml}
        ${bodyHtml}
      </div>

      <footer class="card-footer">
        <div class="card-meta">
          <span class="card-cat-dot" aria-hidden="true"></span>
          <span class="card-cat-link" data-action="filter-by-cat" data-cat="${cat}">${escapeHtml(CATEGORY_LABEL[cat] || cat)}</span>
          ${subLabel ? `<span class="sep">·</span><span>${escapeHtml(subLabel)}</span>` : ''}
          ${tierHtml}
        </div>

        <div class="card-source-row">
          <div class="card-source">${escapeHtml(entry.source || '')}</div>
          <div class="card-actions">
            <button data-action="fav" class="${fav ? 'is-fav' : ''}" aria-label="${fav ? 'Quitar de favoritos' : 'Marcar como favorito'}" title="Favorito">${fav ? ICONS.starFill : ICONS.star}</button>
            <button data-action="share" aria-label="Compartir" title="Compartir">${ICONS.share}</button>
            <button data-action="copy" aria-label="Copiar" title="Copiar contenido">${ICONS.copy}</button>
          </div>
        </div>
      </footer>
    </article>
  `;
}

let currentEntry = null;
export function getCurrentEntry() { return currentEntry; }

function pickPool() {
  const { filters } = getState();
  const pool = filterItems(filters);
  return pool.length ? pool : filterItems({}); // fallback if filters empty
}

export function showCard(entry, { recordHistory = true } = {}) {
  if (!entry) return;
  currentEntry = entry;
  const root = view();
  // Animate out the previous card if present
  const prev = root.querySelector('.card');
  const mount = () => {
    root.innerHTML = `<div class="card-stage">${renderCardHTML(entry)}</div>`;
    if (recordHistory) pushHistory(entry.id);
  };
  if (prev) {
    prev.classList.add('leaving');
    setTimeout(mount, 130);
  } else {
    mount();
  }
}

export function renderRoute({ arg } = {}) {
  if (arg) {
    const it = byId(arg);
    if (it) { showCard(it); return; }
  }
  // Initial: first impression must be Tier A
  const state = getState();
  if (!state.history.length && !state.filters.categories.length && !state.filters.tierAOnly) {
    const first = randomItem(tierAItems());
    showCard(first);
    return;
  }
  // Subsequent random within current filters
  nextRandom();
}

export function nextRandom() {
  const pool = pickPool();
  let pick = randomItem(pool);
  // avoid repeating same one back-to-back when possible
  if (pick && currentEntry && pool.length > 1 && pick.id === currentEntry.id) {
    pick = randomItem(pool);
  }
  showCard(pick);
}

export function navHistory(direction) {
  const id = direction < 0 ? historyPrev() : historyNext();
  if (!id) {
    if (direction > 0) nextRandom();
    return;
  }
  const it = byId(id);
  if (it) {
    currentEntry = it;
    const root = view();
    const prev = root.querySelector('.card');
    const mount = () => { root.innerHTML = `<div class="card-stage">${renderCardHTML(it)}</div>`; };
    if (prev) { prev.classList.add('leaving'); setTimeout(mount, 130); } else { mount(); }
  }
}

// Wire interactions specific to card surface
export function setupCardInteractions(root) {
  let touchStartX = null, touchStartY = null, touchStartT = 0;
  let longPressTimer = null;

  root.addEventListener('touchstart', (e) => {
    if (!e.target.closest('.card-stage')) return;
    const t = e.touches[0];
    touchStartX = t.clientX; touchStartY = t.clientY; touchStartT = Date.now();
    longPressTimer = setTimeout(() => {
      if (currentEntry) {
        copyCurrent();
        if (navigator.vibrate) navigator.vibrate(10);
      }
      longPressTimer = null;
    }, 600);
  }, { passive: true });

  root.addEventListener('touchmove', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }, { passive: true });

  root.addEventListener('touchend', (e) => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (touchStartX == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const dt = Date.now() - touchStartT;
    touchStartX = touchStartY = null;
    if (dt < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) navHistory(1); else navHistory(-1);
    }
  });

  // Right-click → copy
  root.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.card')) {
      e.preventDefault();
      copyCurrent();
    }
  });
}

export async function copyCurrent() {
  if (!currentEntry) return;
  const parts = [
    currentEntry.title,
    currentEntry.subtitle ? `— ${currentEntry.subtitle}` : '',
    '',
    currentEntry.body || '',
    '',
    `Fuente: ${currentEntry.source || '—'}`,
    `Jaikuaa · ${currentEntry.id}`,
  ].filter(Boolean).join('\n');
  try {
    await navigator.clipboard.writeText(parts);
    showToast('Copiado al portapapeles');
  } catch {
    showToast('No se pudo copiar');
  }
}
