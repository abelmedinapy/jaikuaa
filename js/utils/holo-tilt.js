// Tilt fluido: requestAnimationFrame + LERP. Los eventos de orientation
// y mouse solo actualizan targets; un loop independiente interpola
// suavemente entre los valores actuales y los targets a 60fps.

let tiltConnected = false;
export function isTiltActive() { return tiltConnected; }

export async function requestTiltPermission() {
  const DOE = window.DeviceOrientationEvent;
  if (!DOE) return 'unsupported';
  if (typeof DOE.requestPermission === 'function') {
    try {
      const r = await DOE.requestPermission();
      if (r === 'granted') { hookOrientation(); return 'granted'; }
      return 'denied';
    } catch { return 'denied'; }
  }
  hookOrientation();
  return 'granted';
}

let _hook = null;
function hookOrientation() { if (_hook) _hook(); }

export function bindHoloTilt() {
  let tPx = 0, tPy = 0, tRx = 0, tRy = 0;        // targets
  let cPx = 0, cPy = 0, cRx = 0, cRy = 0;        // current (interpolated)
  let autoActive = true, t = 0;
  const LERP = 0.12;
  const r = document.documentElement.style;

  const tick = () => {
    if (autoActive) {
      t += 0.012;
      tPx = Math.sin(t) * 14;
      tPy = Math.sin(t * 1.3) * 10;
      tRx = Math.sin(t * 1.1) * 1.5;
      tRy = Math.sin(t) * 2;
    }
    cPx += (tPx - cPx) * LERP;
    cPy += (tPy - cPy) * LERP;
    cRx += (tRx - cRx) * LERP;
    cRy += (tRy - cRy) * LERP;
    r.setProperty('--px', cPx.toFixed(2) + 'px');
    r.setProperty('--py', cPy.toFixed(2) + 'px');
    r.setProperty('--tilt-x', cRx.toFixed(3) + 'deg');
    r.setProperty('--tilt-y', cRy.toFixed(3) + 'deg');
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  _hook = () => {
    if (tiltConnected || !window.DeviceOrientationEvent) return;
    tiltConnected = true;
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      autoActive = false;
      tPx = Math.max(-40, Math.min(40, -e.gamma * 1.1));
      tPy = Math.max(-32, Math.min(32, -(e.beta - 45) * 0.8));
      tRy = Math.max(-8, Math.min(8, e.gamma * 0.22));
      tRx = Math.max(-8, Math.min(8, -(e.beta - 45) * 0.16));
    });
  };
  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission !== 'function') _hook();

  document.addEventListener('mousemove', (e) => {
    const card = e.target && e.target.closest && e.target.closest('.card');
    if (!card) return;
    autoActive = false;
    const r = card.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    tPx = -nx * 40; tPy = -ny * 32;
    tRx = ny * 8; tRy = -nx * 8;
  });
}
