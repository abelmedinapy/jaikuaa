import { CATEGORIES, CATEGORY_COLOR, CATEGORY_LABEL, search } from '../data.js';
import { getState, setFilters, toggleCategory } from '../store.js';

const view = () => document.getElementById('view');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

let lastQuery = '';
let debounceT = null;

function renderRow(it) {
  const color = CATEGORY_COLOR[it.category];
  const snippet = it.body ? escapeHtml(it.body.slice(0, 140)) + (it.body.length > 140 ? '…' : '') : '';
  const subtitle = it.subtitle ? ` <span class="row-title-sub">· ${escapeHtml(it.subtitle)}</span>` : '';
  const tier = it.tier === 'A' ? `<span class="row-tier" title="Destacado">★</span>` : '';
  return `
    <div class="row" data-action="open-card" data-id="${it.id}">
      <div class="row-title">${escapeHtml(it.title)}${subtitle}</div>
      ${snippet ? `<div class="row-body">${snippet}</div>` : ''}
      <div class="row-meta">
        <span class="chip is-active" style="--cat-color:${color}">
          <span class="chip-dot" style="--cat-color:${color}"></span>${escapeHtml(CATEGORY_LABEL[it.category])}
        </span>
        ${tier}
      </div>
    </div>
  `;
}

function renderChips() {
  const { filters } = getState();
  const active = new Set(filters.categories);
  const chips = CATEGORIES.map((c) => `
    <button class="chip ${active.has(c) ? 'is-active' : ''}" data-action="toggle-cat" data-cat="${c}" style="--cat-color:${CATEGORY_COLOR[c]}">
      <span class="chip-dot" style="--cat-color:${CATEGORY_COLOR[c]}"></span>${escapeHtml(CATEGORY_LABEL[c])}
    </button>
  `).join('');
  const tierChip = `<button class="chip ${filters.tierAOnly ? 'is-active' : ''}" data-action="toggle-tier-a" style="--cat-color:var(--accent-yellow)"><span class="chip-dot" style="--cat-color:var(--accent-yellow)"></span>Tier A</button>`;
  return chips + tierChip;
}

function renderResults(query) {
  const { filters } = getState();
  const results = search(query, filters);
  const count = results.length;
  const countEl = document.querySelector('.search-count');
  if (countEl) countEl.textContent = query ? `${count} ${count === 1 ? 'tarjeta encontrada' : 'tarjetas encontradas'}` : `${count.toLocaleString('es')} tarjetas para descubrir`;
  const listEl = document.querySelector('.search-list');
  if (!listEl) return;
  if (!count) {
    listEl.innerHTML = `<div class="empty"><div class="empty-title">${query ? 'nada con esa palabra' : 'todo el Paraguay esperando'}</div><p>${query ? 'Probá con otra. A veces conviene escribir solo una parte.' : 'Escribí algo arriba: un nombre, una palabra guaraní, un lugar, una idea.'}</p></div>`;
    return;
  }
  listEl.innerHTML = results.map(renderRow).join('');
}

export function renderRoute() {
  const root = view();
  root.innerHTML = `
    <div class="search-wrap">
      <h2 class="search-title">Buscar</h2>
      <input class="input" id="search-input" type="search" placeholder="una palabra guaraní, un lugar, una idea…" value="${escapeHtml(lastQuery)}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
      <div class="search-chips" role="tablist" aria-label="Filtros de categoría">${renderChips()}</div>
      <div class="search-count mono"></div>
    </div>
    <div class="search-list" aria-live="polite"></div>
  `;

  const input = document.getElementById('search-input');
  input.addEventListener('input', () => {
    lastQuery = input.value;
    clearTimeout(debounceT);
    debounceT = setTimeout(() => renderResults(lastQuery), 200);
  });
  input.focus({ preventScroll: true });

  renderResults(lastQuery);
}

export function onChipsChanged() {
  // Re-render chips + results when filters change from elsewhere
  const chipsEl = document.querySelector('.search-chips');
  if (chipsEl) chipsEl.innerHTML = renderChips();
  renderResults(lastQuery);
}

export function handleSearchAction(action, target) {
  if (action === 'toggle-cat') {
    toggleCategory(target.dataset.cat);
    onChipsChanged();
    return true;
  }
  if (action === 'toggle-tier-a') {
    const { filters } = getState();
    setFilters({ tierAOnly: !filters.tierAOnly });
    onChipsChanged();
    return true;
  }
  return false;
}
