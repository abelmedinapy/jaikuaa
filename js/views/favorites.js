import { byId, CATEGORY_COLOR, CATEGORY_LABEL } from '../data.js';
import { getState } from '../store.js';

const view = () => document.getElementById('view');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function renderRow(it) {
  const color = CATEGORY_COLOR[it.category];
  const snippet = it.body ? escapeHtml(it.body.slice(0, 120)) + (it.body.length > 120 ? '…' : '') : '';
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

export function renderRoute() {
  const root = view();
  const { favorites } = getState();
  const ids = [...favorites].reverse();
  const items = ids.map((id) => byId(id)).filter(Boolean);
  if (!items.length) {
    root.innerHTML = `
      <div class="fav-wrap">
        <h2 class="fav-title">Favoritos</h2>
        <div class="empty">
          <div class="empty-title">tu cajón está vacío</div>
          <p>Tocá dos veces una tarjeta o usá el ★ del costado para guardarla acá. Lo que te guste, no se pierde.</p>
        </div>
      </div>
    `;
    return;
  }
  root.innerHTML = `
    <div class="fav-wrap">
      <h2 class="fav-title">Favoritos <span class="count">${items.length}</span></h2>
      <div class="fav-list">${items.map(renderRow).join('')}</div>
    </div>
  `;
}
