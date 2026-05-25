// Data loader, normalization, search indexing and filter API.

export const CATEGORIES = [
  'lugares', 'naturaleza', 'idioma', 'sociedad', 'curiosos',
  'cultura', 'personajes', 'comida', 'historia', 'etnografia', 'mitologia',
];

export const CATEGORY_LABEL = {
  lugares: 'Lugares',
  naturaleza: 'Naturaleza',
  idioma: 'Idioma',
  sociedad: 'Sociedad',
  curiosos: 'Curiosos',
  cultura: 'Cultura',
  personajes: 'Personajes',
  comida: 'Comida',
  historia: 'Historia',
  etnografia: 'Etnografía',
  mitologia: 'Mitología',
};

export const CATEGORY_COLOR = {
  lugares: 'var(--cat-lugares)',
  naturaleza: 'var(--cat-naturaleza)',
  idioma: 'var(--cat-idioma)',
  sociedad: 'var(--cat-sociedad)',
  curiosos: 'var(--cat-curiosos)',
  cultura: 'var(--cat-cultura)',
  personajes: 'var(--cat-personajes)',
  comida: 'var(--cat-comida)',
  historia: 'var(--cat-historia)',
  etnografia: 'var(--cat-etnografia)',
  mitologia: 'var(--cat-mitologia)',
};

// Hex versions for canvas / leaflet (must match tokens.css).
export const CATEGORY_HEX = {
  lugares: '#1E8F4E',
  naturaleza: '#5A8C3F',
  idioma: '#FF6B9D',
  sociedad: '#A8A29A',
  curiosos: '#FFC72C',
  cultura: '#8E7BC9',
  personajes: '#D52B1E',
  comida: '#E07856',
  historia: '#B8956A',
  etnografia: '#8B6F47',
  mitologia: '#5D3A8E',
};

let _data = null;
let _byId = null;
let _byCategory = null;
let _withLocation = null;
let _tierA = null;
let _index = null; // Map<token, Set<id>>

const STOP = new Set([
  'de','la','el','los','las','y','en','del','que','con','para','por','un','una','al','se','su','sus','o','a','es','lo','le','les','este','esta','sin','sobre','entre','como','más','muy','también','desde','sus','si','no','ya','pero','son','fue','ser','han','hay','su','sus'
]);

const norm = (s) => s
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9ñ\s]/gi, ' ');

export async function loadData() {
  if (_data) return _data;
  const res = await fetch('data/data.json', { cache: 'default' });
  if (!res.ok) throw new Error('No se pudo cargar el dataset (' + res.status + ').');
  const raw = await res.json();
  _data = raw;
  _byId = new Map();
  _byCategory = new Map();
  _withLocation = [];
  _tierA = [];
  for (const it of raw.items) {
    _byId.set(it.id, it);
    if (!_byCategory.has(it.category)) _byCategory.set(it.category, []);
    _byCategory.get(it.category).push(it);
    if (it.location && typeof it.location.lat === 'number') _withLocation.push(it);
    if (it.tier === 'A') _tierA.push(it);
  }
  // Build search index lazily after first paint to keep boot fast.
  const buildIdx = () => buildIndex();
  if ('requestIdleCallback' in window) {
    requestIdleCallback(buildIdx, { timeout: 1500 });
  } else {
    setTimeout(buildIdx, 200);
  }
  return _data;
}

function buildIndex() {
  if (_index) return _index;
  _index = new Map();
  for (const it of _data.items) {
    const text = [it.title, it.subtitle, it.body].filter(Boolean).join(' ');
    const tokens = norm(text).split(/\s+/);
    for (const t of tokens) {
      if (!t || t.length < 3 || STOP.has(t)) continue;
      let set = _index.get(t);
      if (!set) { set = new Set(); _index.set(t, set); }
      set.add(it.id);
    }
  }
  return _index;
}

export function meta() { return _data ? { total: _data.total, generated_at: _data.generated_at, version: _data.version } : null; }
export function allItems() { return _data ? _data.items : []; }
export function byId(id) { return _byId ? _byId.get(id) : null; }
export function tierAItems() { return _tierA || []; }
export function locatedItems() { return _withLocation || []; }

export function filterItems({ categories = [], tierAOnly = false } = {}) {
  const items = allItems();
  if (!categories.length && !tierAOnly) return items;
  const catSet = new Set(categories);
  return items.filter((it) =>
    (!catSet.size || catSet.has(it.category)) &&
    (!tierAOnly || it.tier === 'A')
  );
}

export function randomItem(pool) {
  if (!pool || !pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Related items: same subcategory first, then same category, excluding the entry itself.
export function getRelated(entry, n = 3) {
  if (!entry || !_data) return [];
  const sameSub = _byCategory.get(entry.category)?.filter(
    (i) => i.subcategory === entry.subcategory && i.id !== entry.id
  ) || [];
  const pool = sameSub.length >= n ? sameSub :
    (_byCategory.get(entry.category) || []).filter((i) => i.id !== entry.id);
  // Random sample without repetition
  const out = [];
  const used = new Set();
  while (out.length < n && used.size < pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(pool[idx]);
  }
  return out;
}

// Deterministic pick for "Tarjeta del día" based on YYYY-MM-DD hash.
export function dailyItem(pool = allItems()) {
  if (!pool.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  let h = 2166136261;
  for (let i = 0; i < today.length; i++) {
    h ^= today.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return pool[h % pool.length];
}

export function search(query, { categories = [], tierAOnly = false, limit = 200 } = {}) {
  if (!_data) return [];
  const q = norm(query || '').trim();
  if (!q) {
    return filterItems({ categories, tierAOnly }).slice(0, limit);
  }
  if (!_index) buildIndex();
  const terms = q.split(/\s+/).filter((t) => t.length >= 2);
  if (!terms.length) return [];
  let candidate = null;
  for (const t of terms) {
    // prefix/substring match across index keys for short tolerant search
    const matches = new Set();
    for (const [key, ids] of _index) {
      if (key.startsWith(t) || (t.length >= 4 && key.includes(t))) {
        for (const id of ids) matches.add(id);
      }
    }
    candidate = candidate ? new Set([...candidate].filter((x) => matches.has(x))) : matches;
    if (!candidate.size) break;
  }
  if (!candidate || !candidate.size) return [];
  const catSet = new Set(categories);
  const results = [];
  for (const id of candidate) {
    const it = _byId.get(id);
    if (!it) continue;
    if (catSet.size && !catSet.has(it.category)) continue;
    if (tierAOnly && it.tier !== 'A') continue;
    results.push(it);
  }
  // Sort: title prefix matches first, then tier A, then by title.
  results.sort((a, b) => {
    const an = norm(a.title), bn = norm(b.title);
    const ap = terms.some((t) => an.startsWith(t)) ? 0 : 1;
    const bp = terms.some((t) => bn.startsWith(t)) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    if (a.tier !== b.tier) return a.tier === 'A' ? -1 : 1;
    return a.title.localeCompare(b.title, 'es');
  });
  return results.slice(0, limit);
}
