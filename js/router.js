// Minimal hash router. Routes: '', 'search', 'map', 'favorites', 'settings', 'card/:id'

import { setState, getState } from './store.js';

const routes = new Map();

export function defineRoute(name, handler) {
  routes.set(name, handler);
}

function parse() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '');
  if (!raw) return { name: '', arg: null };
  const [name, arg] = raw.split('/');
  return { name, arg: arg ? decodeURIComponent(arg) : null };
}

export function navigate(name, arg = null, opts = {}) {
  const hash = name ? '#/' + name + (arg ? '/' + encodeURIComponent(arg) : '') : '#/';
  if (window.location.hash === hash && !opts.force) {
    // Same hash → trigger rerender manually (used by Random button).
    handle();
    return;
  }
  window.location.hash = hash;
}

function handle() {
  const { name, arg } = parse();
  setState({ route: name, routeArg: arg });
  const fn = routes.get(name) || routes.get('');
  if (fn) fn({ arg, state: getState() });
}

export function startRouter() {
  window.addEventListener('hashchange', handle);
  handle();
}

export function currentRoute() { return parse(); }
