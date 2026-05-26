// CardView: el corazón de Jaikuaa.
import { byId, CATEGORY_COLOR, CATEGORY_LABEL, filterItems, getRelated, randomItem, tierAItems } from '../data.js';
import { getState, isFav, pushHistory, toggleFav, historyPrev, historyNext, hasPrev, seenTodayCount } from '../store.js';
import { ICONS } from '../utils/icons.js';
import { showToast } from '../app.js';

const view = () => document.getElementById('view');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function renderRelated(entry) {
  const related = getRelated(entry, 3);
  if (!related.length) return '';
  const links = related.map((r) =>
    `<a class="related-link" data-action="open-card" data-id="${r.id}">${escapeHtml(r.title)}</a>`
  ).join('<span class="related-sep">·</span>');
  return `
    <div class="card-related">
      <span class="related-label">seguí el hilo</span>
      <div class="related-links">${links}</div>
    </div>
  `;
}

function renderCardHTML(entry) {
  const cat = entry.category;
  const color = CATEGORY_COLOR[cat] || 'var(--fg-tertiary)';
  const isGuarani = cat === 'idioma';
  const fav = isFav(entry.id);
  const yearHtml = entry.year ? `<span class="card-title-year">${entry.year}</span>` : '';
  const subtitleHtml = entry.subtitle ? `<p class="card-subtitle">${escapeHtml(entry.subtitle)}</p>` : '';
  const bodyHtml = entry.body
    ? `<p class="card-body${entry.body.length > 120 ? ' has-dropcap' : ''}">${escapeHtml(entry.body)}</p>`
    : '';
  const tierHtml = entry.tier === 'A' ? `<span class="card-tier-badge" title="Destacado" aria-label="Destacado">★</span>` : '';
  const subLabel = entry.subcategory_label || entry.subcategory || '';

  return `
    <article class="card" data-id="${entry.id}" style="--cat-color:${color};" data-action="next-card">
      <div class="card-hero">
        <h1 class="card-title ${isGuarani ? 'is-guarani' : ''}">${escapeHtml(entry.title)}${yearHtml}</h1>
        ${subtitleHtml}
        ${bodyHtml}
      </div>

      ${renderRelated(entry)}

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
            <button data-action="fav" class="${fav ? 'is-fav' : ''}" aria-label="${fav ? 'Quitar de favoritos' : 'Marcar como favorito'}" title="Favorito (doble tap)">${fav ? ICONS.starFill : ICONS.star}</button>
            <button data-action="share" aria-label="Compartir" title="Compartir">${ICONS.share}</button>
            <button data-action="copy" aria-label="Copiar texto" title="Copiar texto">${ICONS.copy}</button>
          </div>
        </div>
      </footer>

      <div class="fav-burst" aria-hidden="true">${ICONS.starFill}</div>
    </article>
  `;
}

let currentEntry = null;
export function getCurrentEntry() { return currentEntry; }

function pickPool() {
  const { filters } = getState();
  const pool = filterItems(filters);
  return pool.length ? pool : filterItems({});
}

function mountStage(html) {
  const root = view();
  const count = seenTodayCount();
  const prevBtn = hasPrev()
    ? `<button class="prev-btn" data-action="prev-card" aria-label="Tarjeta anterior" title="Anterior">←</button>`
    : `<span class="prev-btn-placeholder" aria-hidden="true"></span>`;
  const countLine = count > 0
    ? `<div class="session-count" aria-label="Tarjetas descubiertas hoy">llevás ${count} ${count === 1 ? 'tarjeta' : 'tarjetas'} hoy</div>`
    : '';
  root.innerHTML = `
    <div class="card-stage">
      ${html}
      ${countLine}
      <div class="discover-row">
        ${prevBtn}
        <button class="discover-btn" data-action="discover-next" aria-label="Mostrame otra tarjeta">
          <span>Mostrame otra</span> ${ICONS.dice}
        </button>
      </div>
    </div>
  `;
}

export function showCard(entry, { recordHistory = true, direction = null } = {}) {
  if (!entry) return;
  currentEntry = entry;
  const root = view();
  const prev = root.querySelector('.card');
  const doMount = () => {
    mountStage(renderCardHTML(entry));
    if (recordHistory) pushHistory(entry.id);
    if (direction != null) {
      const newCard = root.querySelector('.card');
      if (newCard) newCard.classList.add(direction > 0 ? 'enter-from-bottom' : 'enter-from-top');
    }
  };
  if (prev) {
    prev.classList.add('leaving');
    if (direction != null) prev.classList.add(direction > 0 ? 'leave-up' : 'leave-down');
    setTimeout(doMount, direction != null ? 180 : 130);
  } else {
    doMount();
  }
}

export function renderRoute({ arg } = {}) {
  if (arg) {
    const it = byId(arg);
    if (it) { showCard(it); return; }
  }
  const state = getState();
  if (!state.history.length && !state.filters.categories.length && !state.filters.tierAOnly) {
    const first = randomItem(tierAItems());
    showCard(first);
    return;
  }
  nextRandom();
}

export function nextRandom() {
  const pool = pickPool();
  let pick = randomItem(pool);
  if (pick && currentEntry && pool.length > 1 && pick.id === currentEntry.id) {
    pick = randomItem(pool);
  }
  showCard(pick);
}

export function navHistory(direction) {
  const id = direction < 0 ? historyPrev() : historyNext();
  if (!id) { if (direction > 0) nextRandom(); return; }
  const it = byId(id);
  if (it) showCard(it, { recordHistory: false, direction });
}

// Fav animation pulse (double-tap or button)
export function pulseFavOnCard() {
  const burst = document.querySelector('.card .fav-burst');
  if (!burst) return;
  burst.classList.remove('show');
  // force reflow to restart animation
  void burst.offsetWidth;
  burst.classList.add('show');
  if (navigator.vibrate) navigator.vibrate(10);
}

// Wire interactions specific to card surface
export function setupCardInteractions(root) {
  let touchStartX = null, touchStartY = null, touchStartT = 0;
  let longPressTimer = null;
  let lastTapT = 0;
  let suppressNextClick = false;

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

    // Swipe vertical (estilo TikTok): up = siguiente, down = anterior
    if (dt < 600 && Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      suppressNextClick = true;
      setTimeout(() => suppressNextClick = false, 350);
      if (dy < 0) navHistory(1); else navHistory(-1);
      return;
    }

    // Double tap (only over the article.card body, not over action buttons)
    const tappedCard = e.target.closest('.card') && !e.target.closest('[data-action]:not([data-action="next-card"])');
    if (tappedCard) {
      const now = Date.now();
      if (now - lastTapT < 320) {
        e.preventDefault();
        suppressNextClick = true;
        setTimeout(() => suppressNextClick = false, 350);
        if (currentEntry) {
          toggleFav(currentEntry.id);
          // Update the fav button state on the card
          const favBtn = document.querySelector('.card-actions [data-action="fav"]');
          if (favBtn) {
            const now = isFav(currentEntry.id);
            favBtn.classList.toggle('is-fav', now);
            favBtn.innerHTML = now ? ICONS.starFill : ICONS.star;
          }
          pulseFavOnCard();
          showToast(isFav(currentEntry.id) ? 'Guardada en favoritos ★' : 'Sacada de favoritos');
        }
        lastTapT = 0;
      } else {
        lastTapT = now;
      }
    }
  });

  // Suppress synthetic click after suppression event
  root.addEventListener('click', (e) => {
    if (suppressNextClick && e.target.closest('.card')) {
      e.stopPropagation();
      e.preventDefault();
      suppressNextClick = false;
    }
  }, true);

  // Right-click → copy
  root.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.card')) { e.preventDefault(); copyCurrent(); }
  });

  // Desktop double-click → fav
  root.addEventListener('dblclick', (e) => {
    if (e.target.closest('[data-action]:not([data-action="next-card"])')) return;
    if (!e.target.closest('.card')) return;
    e.preventDefault();
    if (currentEntry) {
      toggleFav(currentEntry.id);
      const favBtn = document.querySelector('.card-actions [data-action="fav"]');
      if (favBtn) {
        const now = isFav(currentEntry.id);
        favBtn.classList.toggle('is-fav', now);
        favBtn.innerHTML = now ? ICONS.starFill : ICONS.star;
      }
      pulseFavOnCard();
      showToast(isFav(currentEntry.id) ? 'Agregado a favoritos' : 'Quitado de favoritos');
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
    showToast('Copiado, listo para pegar');
  } catch {
    showToast('No se pudo copiar — perdón');
  }
}
