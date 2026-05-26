// Luz de gravedad: la zona "iluminada" del pattern se mueve siguiendo
// la inclinación del celular (deviceorientation) o el cursor (desktop).
// La metáfora: una linterna apoyada sobre la card que se desliza hacia
// donde "cae" el celular.
export function bindHoloTilt() {
  const apply = (xPct, yPct) => {
    document.documentElement.style.setProperty('--sx', xPct + '%');
    document.documentElement.style.setProperty('--sy', yPct + '%');
  };

  // Animación suave si no hay tilt disponible (lemniscata lenta).
  let t = 0, autoActive = true;
  const autoTick = () => {
    if (!autoActive) return;
    t += 0.01;
    const x = 50 + Math.sin(t) * 22;
    const y = 50 + Math.sin(t * 1.3) * 16;
    apply(x, y);
    requestAnimationFrame(autoTick);
  };
  requestAnimationFrame(autoTick);

  const tryOrientation = () => {
    if (!window.DeviceOrientationEvent) return;
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      autoActive = false;
      // Gravedad inversa: si inclinás hacia la derecha (gamma>0), la
      // luz "cae" a la izquierda. Si inclinás hacia adelante (beta<45),
      // la luz cae hacia abajo.
      const x = Math.max(5, Math.min(95, 50 - e.gamma * 1.6));
      const y = Math.max(5, Math.min(95, 50 + (e.beta - 45) * 1.2));
      apply(x, y);
    });
  };

  // iOS 13+ requires user gesture for DeviceOrientation permission.
  document.addEventListener('touchstart', function once() {
    document.removeEventListener('touchstart', once);
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then((r) => { if (r === 'granted') tryOrientation(); }).catch(() => {});
    } else {
      tryOrientation();
    }
  }, { passive: true });

  // Desktop: mouse mueve la luz dentro de la card hovered.
  document.addEventListener('mousemove', (e) => {
    const card = e.target && e.target.closest && e.target.closest('.card');
    if (!card) return;
    autoActive = false;
    const r = card.getBoundingClientRect();
    apply(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  });
}
