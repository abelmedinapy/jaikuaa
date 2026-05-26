// Gravedad sobre la card: el pattern de dots se desplaza y la card
// entera se inclina sutilmente en 3D según el movimiento del celu.
// Sin manchas, sin luces — solo respuesta física al device tilt.
export function bindHoloTilt() {
  const apply = (px, py, rx, ry) => {
    const r = document.documentElement.style;
    r.setProperty('--px', px.toFixed(1) + 'px');
    r.setProperty('--py', py.toFixed(1) + 'px');
    r.setProperty('--tilt-x', rx.toFixed(2) + 'deg');
    r.setProperty('--tilt-y', ry.toFixed(2) + 'deg');
  };

  // Animación auto sutil cuando no hay tilt (micro balanceo).
  let t = 0, autoActive = true;
  const autoTick = () => {
    if (!autoActive) return;
    t += 0.008;
    apply(Math.sin(t) * 12, Math.sin(t * 1.3) * 9, Math.sin(t * 1.1) * 1.2, Math.sin(t) * 1.8);
    requestAnimationFrame(autoTick);
  };
  requestAnimationFrame(autoTick);

  const tryOrientation = () => {
    if (!window.DeviceOrientationEvent) return;
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      autoActive = false;
      const px = Math.max(-40, Math.min(40, -e.gamma * 1.1));
      const py = Math.max(-32, Math.min(32, -(e.beta - 45) * 0.8));
      // Tilt 3D de la card: gamma → rotateY, beta → rotateX
      const ry = Math.max(-8, Math.min(8, e.gamma * 0.22));
      const rx = Math.max(-8, Math.min(8, -(e.beta - 45) * 0.16));
      apply(px, py, rx, ry);
    });
  };

  // iOS 13+ permission gate
  document.addEventListener('touchstart', function once() {
    document.removeEventListener('touchstart', once);
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then((r) => { if (r === 'granted') tryOrientation(); }).catch(() => {});
    } else {
      tryOrientation();
    }
  }, { passive: true });

  // Desktop: mousemove
  document.addEventListener('mousemove', (e) => {
    const card = e.target && e.target.closest && e.target.closest('.card');
    if (!card) return;
    autoActive = false;
    const r = card.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    apply(-nx * 40, -ny * 32, ny * 8, -nx * 8);
  });
}
