# Jaikuaa

> **Jaikuaa** (guaraní: *conozcamos / sabemos*) — una PWA de cultura paraguaya, una tarjeta a la vez.

3.019 entries curados sobre lugares, naturaleza, idioma guaraní, cultura, comida, personajes, historia, leyendas y vida cotidiana. No es Wikipedia: es un descubridor poético.

## Stack

HTML5 + CSS3 + JavaScript vanilla. Sin frameworks, sin bundlers, sin npm install. Dependencias externas vía CDN: Leaflet (mapa, lazy) y Google Fonts.

## Estructura

```
app/
├── index.html
├── manifest.json
├── service-worker.js
├── css/{tokens,base,components,views}.css
├── js/
│   ├── app.js          ← bootstrap, routing, event delegation
│   ├── data.js         ← fetch + index + filter API
│   ├── store.js        ← state + favorites + history
│   ├── router.js       ← hash routing
│   ├── views/{card,search,map,favorites,settings}.js
│   └── utils/{icons,storage,share}.js
├── data/data.json      ← 3019 entries (1.3 MB)
└── assets/icons/       ← PWA icons (192/512/svg)
```

## Desarrollo local

```bash
cd app
python3 -m http.server 8000
# abrir http://127.0.0.1:8000
```

(El service worker requiere HTTPS o localhost.)

## Deploy a Cloudflare Pages

1. Repo en GitHub: `ampost/jaikuaa`
2. Cloudflare Pages → Create project → Connect to GitHub → seleccionar `ampost/jaikuaa`
3. Build settings:
   - **Build command:** *(vacío)*
   - **Build output directory:** `/`
   - **Root directory:** *(vacío)*
4. Custom domain: `jaikuaa.ampost.pro` — en Cloudflare DNS de `ampost.pro`, CNAME `jaikuaa` → `<project>.pages.dev`

## Funcionalidades

- **Random Tier A** como primera impresión.
- **Tap / swipe / flechas** para navegar tarjetas.
- **Long press** (móvil) o **click derecho** (desktop) para copiar contenido.
- **Búsqueda** con índice invertido + diacritics-insensitive.
- **Mapa** con Leaflet (lazy) y CartoDB Dark Matter.
- **Favoritos** en `localStorage`.
- **Compartir como PNG** (1080×1080) con Canvas API nativa.
- **PWA** instalable, offline-first (Service Worker).
- **Tarjeta del día** determinista por hash de fecha.

## Licencia

Dataset: Creative Commons BY-SA 4.0. Curaduría: AMPOST.
