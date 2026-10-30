/** Fähigkeiten des Geräts – bestimmt u. a., ob Handy-Balance spielbar ist. */
export function detectCaps() {
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const motion = touch && typeof window.DeviceMotionEvent !== 'undefined';
  return { touch, motion };
}

/** iOS verlangt eine explizite Freigabe für Bewegungssensoren (nur per Nutzer-Geste). */
export async function requestMotionPermission() {
  const DME = window.DeviceMotionEvent;
  if (DME && typeof DME.requestPermission === 'function') {
    try {
      return (await DME.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  return typeof DME !== 'undefined';
}
