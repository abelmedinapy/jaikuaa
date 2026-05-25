// Tiny reactive store + favorites helpers.
import { storage } from './utils/storage.js';

const listeners = new Set();

const initial = {
  ready: false,
  route: '',
  routeArg: null,
  filters: storage.get('filters', { categories: [], tierAOnly: false }),
  favorites: new Set(storage.get('favorites', [])),
  history: [],     // last 50 viewed IDs (for back nav within card view)
  histIdx: -1,
  visits: storage.get('visits', 0),
  installPrompt: null,
  online: navigator.onLine,
};

const state = { ...initial };

export function getState() { return state; }

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) {
    try { fn(state); } catch (e) { console.error(e); }
  }
}

export function setState(patch) {
  Object.assign(state, patch);
  emit();
}

// Favorites
export function isFav(id) { return state.favorites.has(id); }
export function toggleFav(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  storage.set('favorites', [...state.favorites]);
  emit();
  return state.favorites.has(id);
}
export function clearFavs() {
  state.favorites.clear();
  storage.set('favorites', []);
  emit();
}

// Filters
export function setFilters(patch) {
  state.filters = { ...state.filters, ...patch };
  storage.set('filters', state.filters);
  emit();
}
export function toggleCategory(cat) {
  const cats = new Set(state.filters.categories);
  if (cats.has(cat)) cats.delete(cat); else cats.add(cat);
  setFilters({ categories: [...cats] });
}
export function clearFilters() {
  setFilters({ categories: [], tierAOnly: false });
}

// History (for card prev/next)
export function pushHistory(id) {
  // Trim future if user navigated back then chose new card
  if (state.histIdx < state.history.length - 1) {
    state.history = state.history.slice(0, state.histIdx + 1);
  }
  if (state.history[state.history.length - 1] !== id) {
    state.history.push(id);
    if (state.history.length > 50) state.history.shift();
  }
  state.histIdx = state.history.length - 1;
}
export function historyPrev() {
  if (state.histIdx <= 0) return null;
  state.histIdx -= 1;
  return state.history[state.histIdx];
}
export function historyNext() {
  if (state.histIdx >= state.history.length - 1) return null;
  state.histIdx += 1;
  return state.history[state.histIdx];
}

export function incVisits() {
  state.visits = (state.visits || 0) + 1;
  storage.set('visits', state.visits);
}
