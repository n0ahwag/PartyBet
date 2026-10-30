import { useEffect, useState, useCallback } from 'react';
import QRCodeLib from 'qrcode';
import { POWERUPS } from '../game/constants.js';

export function Avatar({ player, size = '' }) {
  if (!player) return <div className={`avatar ${size}`} style={{ background: 'var(--bg-soft)' }}>?</div>;
  return (
    <div className={`avatar ${size}`} style={{ background: `color-mix(in srgb, ${player.color} 22%, var(--card))` }}>
      {player.avatar}
    </div>
  );
}

export function Sips({ n, className = '' }) {
  return <span className={`balance sip ${className}`}>{n}</span>;
}

export function PlayerRow({ player, me, right, children }) {
  return (
    <div className={`player-row ${me ? 'me' : ''} ${player.balance <= 0 ? 'broke' : ''}`}>
      <Avatar player={player} />
      <div className="grow">
        <div style={{ fontWeight: 800 }}>
          {player.name} {me && <span className="faint small">(du)</span>}
        </div>
        {children}
      </div>
      {right ?? <Sips n={player.balance} />}
    </div>
  );
}

export function Inventory({ inventory = {} }) {
  const items = Object.entries(inventory).filter(([, n]) => n > 0);
  if (!items.length) return <span className="faint small">keine Power-ups</span>;
  return (
    <span className="small">
      {items.map(([id, n]) => (
        <span key={id} title={POWERUPS[id]?.label} style={{ marginRight: 6 }}>
          {POWERUPS[id]?.icon}{n > 1 ? `×${n}` : ''}
        </span>
      ))}
    </span>
  );
}

export function QRCode({ text, size = 220 }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    QRCodeLib.toDataURL(text, { margin: 0, width: size * 2, color: { dark: '#1f1b16', light: '#ffffff' } })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [text, size]);
  return <div className="qr" style={{ width: size + 24 }}>{src && <img src={src} alt="QR-Code zum Beitreten" />}</div>;
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(null), 3200);
    return () => clearTimeout(t);
  }, [msg]);
  const toast = useCallback((m) => setMsg(m), []);
  const node = msg ? <div className="toast slide-up">{msg}</div> : null;
  return [toast, node];
}

/** Führt eine async Engine-Aktion aus und zeigt Fehler als Toast. */
export function useAction(toast) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      console.error(e);
      toast?.(e.message || 'Fehler');
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return [run, busy];
}

export function Loading({ text = 'Lade…' }) {
  return <div className="page center"><p className="muted" style={{ fontWeight: 800 }}>{text}</p></div>;
}
