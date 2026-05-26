// Gravedad sobre el pattern de dots: cuando inclinás el celu,
// el pattern entero se desplaza unos píxeles como si los puntos
// se balancearan por gravedad. Sin manchas, sin luces, sin
// gradients — solo desplazamiento sutil del pattern.
export function bindHoloTilt() {
  const apply = (px, py) => {
    document.documentElement.style.setProperty('--px', px.toFixed(1) + 'px');
    document.documentElement.style.setProperty('--py', py.toFixed(1) + 'px');
  };

  // Animación auto si no hay tilt: micro balanceo lento.
  let t = 0, autoActive = true;
  const autoTick = () => {
    if (!autoActive) return;
    t += 0.008;
    apply(Math.sin(t) * 10, Math.sin(t * 1.3) * 7);
    requestAnimationFrame(autoTick);
  };
  requestAnimationFrame(autoTick);

  const tryOrientation = () => {
    if (!window.DeviceOrientationEvent) return;
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      autoActive = false;
      // Inclinás derecha (gamma>0) → pattern se mueve a la izquierda
      // Inclinás adelante (beta<45) → pattern se mueve hacia arriba
      const px = Math.max(-32, Math.min(32, -e.gamma * 0.85));
      const py = Math.max(-28, Math.min(28, -(e.beta - 45) * 0.65));
      apply(px, py);
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

  // Desktop: mousemove sobre cualquier card mueve el pattern
  document.addEventListener('mousemove', (e) => {
    const card = e.target && e.target.closest && e.target.closest('.card');
    if (!card) return;
    autoActive = false;
    const r = card.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    apply(-nx * 32, -ny * 26);
  });
}
