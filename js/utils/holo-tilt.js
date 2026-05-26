// Holographic tilt: el reflejo holo de las cards Tier A reacciona
// al movimiento del celular (deviceorientation) o al cursor (desktop).
export function bindHoloTilt() {
  const apply = (xPct, yPct) => {
    const holo = document.querySelector('.card.is-tier-a .card-holo');
    if (!holo) return;
    holo.style.backgroundPosition = `${xPct}% ${yPct}%`;
    holo.style.animation = 'none';
    document.documentElement.classList.add('tilt-on');
  };

  const tryOrientation = () => {
    if (!window.DeviceOrientationEvent) return;
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      const x = Math.max(0, Math.min(100, 50 + e.gamma * 1.8));
      const y = Math.max(0, Math.min(100, 50 + (e.beta - 45) * 1.4));
      apply(x, y);
    });
  };

  // iOS 13+: requestPermission needs user gesture
  document.addEventListener('touchstart', function once() {
    document.removeEventListener('touchstart', once);
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then((r) => { if (r === 'granted') tryOrientation(); }).catch(() => {});
    } else {
      tryOrientation();
    }
  }, { passive: true });

  // Desktop mouse fallback
  document.addEventListener('mousemove', (e) => {
    const card = e.target && e.target.closest && e.target.closest('.card.is-tier-a');
    if (!card) return;
    const r = card.getBoundingClientRect();
    apply(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  });
}
