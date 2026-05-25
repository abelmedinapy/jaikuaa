// MapView: lazy-loads Leaflet from CDN on first visit.
import { CATEGORY_HEX, locatedItems, filterItems } from '../data.js';
import { getState } from '../store.js';
import { navigate } from '../router.js';

const view = () => document.getElementById('view');

let leafletLoaded = false;
let mapInstance = null;
let markerLayer = null;

function loadLeaflet() {
  if (leafletLoaded && window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
    // JS
    if (window.L) { leafletLoaded = true; return resolve(window.L); }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.crossOrigin = '';
    s.onload = () => { leafletLoaded = true; resolve(window.L); };
    s.onerror = () => reject(new Error('No se pudo cargar Leaflet'));
    document.head.appendChild(s);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function pickItems() {
  const { filters } = getState();
  const filtered = filterItems(filters);
  const ids = new Set(filtered.map((i) => i.id));
  return locatedItems().filter((i) => ids.has(i.id));
}

export async function renderRoute() {
  const root = view();
  root.innerHTML = `
    <div class="map-wrap">
      <div id="map" role="application" aria-label="Mapa de Paraguay con entries de Jaikuaa"></div>
      <div class="map-loading" id="map-loading">cargando mapa…</div>
    </div>
  `;
  try {
    const L = await loadLeaflet();
    const items = pickItems();
    const container = document.getElementById('map');
    if (!container) return;
    // (Re)create instance; previous one belongs to a destroyed DOM.
    mapInstance = L.map(container, {
      center: [-23.5, -58.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap & CARTO',
      subdomains: 'abcd',
    }).addTo(mapInstance);

    markerLayer = L.layerGroup().addTo(mapInstance);
    if (!items.length) {
      const loading = document.getElementById('map-loading');
      if (loading) {
        loading.innerHTML = `<div class="empty"><div class="empty-title">Sin entries para los filtros</div><p>Limpiá los filtros desde Ajustes para ver más puntos.</p></div>`;
      }
    } else {
      for (const it of items) {
        const color = CATEGORY_HEX[it.category] || '#9C968B';
        const icon = L.divIcon({
          className: '',
          html: `<div class="jk-dot-marker" style="background:${color}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const m = L.marker([it.location.lat, it.location.lon], { icon, title: it.title })
          .bindPopup(`
            <div class="pop-title">${escapeHtml(it.title)}</div>
            <a class="pop-link" data-pop-id="${it.id}">Ver →</a>
          `);
        m.addTo(markerLayer);
      }
      const loading = document.getElementById('map-loading');
      if (loading) loading.remove();
    }

    mapInstance.on('popupopen', (e) => {
      const link = e.popup.getElement().querySelector('[data-pop-id]');
      if (link) {
        link.addEventListener('click', (ev) => {
          ev.preventDefault();
          navigate('card', link.dataset.popId);
        });
      }
    });
  } catch (err) {
    const loading = document.getElementById('map-loading');
    if (loading) loading.innerHTML = `<div class="empty"><div class="empty-title">No pudimos cargar el mapa</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}
