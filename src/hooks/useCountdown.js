import { useEffect, useState } from 'react';

/** Sekunden bis zu einem Zeitstempel (ms). */
export function useSecondsLeft(endsAt) {
  const calc = () => (endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (!endsAt) return undefined;
    const t = setInterval(() => setLeft(calc()), 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);
  return left;
}

/** Lokaler 3-2-1-Countdown; ruft onDone bei 0. */
export function useLocalCountdown(active, from = 3, onTick, onDone) {
  const [n, setN] = useState(null);
  useEffect(() => {
    if (!active) {
      setN(null);
      return undefined;
    }
    let i = from;
    setN(i);
    onTick?.(i);
    const t = setInterval(() => {
      i -= 1;
      if (i <= 0) {
        clearInterval(t);
        setN(0);
        onDone?.();
      } else {
        setN(i);
        onTick?.(i);
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return n;
}
