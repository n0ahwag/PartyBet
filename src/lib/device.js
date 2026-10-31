/** Fähigkeiten des Geräts – bestimmt u. a., ob Handy-Balance spielbar ist. */
export function detectCaps() {
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const motion = touch && typeof window.DeviceMotionEvent !== 'undefined';
  const compass = touch && typeof window.DeviceOrientationEvent !== 'undefined';
  const camera = !!navigator.mediaDevices?.getUserMedia;
  const mic = camera && !!(window.AudioContext || window.webkitAudioContext);
  return { touch, motion, compass, camera, mic };
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

/** Kompass (DeviceOrientation) – iOS braucht ebenfalls eine Freigabe per Nutzer-Geste. */
export async function requestOrientationPermission() {
  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function') {
    try {
      return (await DOE.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  return typeof DOE !== 'undefined';
}
