import { useEffect, useState, useCallback } from 'react';
import QRCodeLib from 'qrcode';
import { POWERUPS } from '../game/constants.js';
import { t, LANGS, useLang, setLang } from '../i18n/index.js';
import { navigate } from '../lib/router.js';

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
          {player.name} {me && <span className="faint small">({t('du')})</span>}
        </div>
        {children}
      </div>
      {right ?? <Sips n={player.balance} />}
    </div>
  );
}

export function Inventory({ inventory = {} }) {
  const items = Object.entries(inventory).filter(([, n]) => n > 0);
  if (!items.length) return <span className="faint small">{t('keine Power-ups')}</span>;
  return (
    <span className="small">
      {items.map(([id, n]) => (
        <span key={id} title={t(POWERUPS[id]?.label)} style={{ marginRight: 6 }}>
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
  return <div className="qr" style={{ width: size + 24 }}>{src && <img src={src} alt={t('QR-Code zum Beitreten')} />}</div>;
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return undefined;
    const timer = setTimeout(() => setMsg(null), 3200);
    return () => clearTimeout(timer);
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
      toast?.(e.code === 'permission-denied'
        ? t('Keine Berechtigung – die Firestore-Regeln in der Firebase-Konsole sind vermutlich veraltet. Bitte firestore.rules aus dem Repo neu einfügen.')
        : t(e.message) || t('Fehler'));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return [run, busy];
}

export function Loading({ text }) {
  return (
    <div className="page center">
      <p className="muted" style={{ fontWeight: 800 }}>{text ?? t('Lade…')}</p>
      <button className="btn ghost sm" onClick={() => navigate('/')}>🏠 {t('Zur Startseite')}</button>
    </div>
  );
}

export function OfflineBanner({ online }) {
  if (online) return null;
  return (
    <div className="toast" style={{ top: 'calc(12px + env(safe-area-inset-top))', bottom: 'auto', background: 'var(--bad)' }}>
      📡 {t('Verbindung wird wiederhergestellt…')}
    </div>
  );
}

/** Sprachwahl (pro Gerät). full = beide Sprachen als Buttons, sonst kompakter Umschalter. */
/** Sicherheitsabfrage als eigenes Fenster (übersetzbar, passt zum Design). */
export function ConfirmDialog({ title, text, confirmLabel, cancelLabel, onConfirm, onCancel, danger = true }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="overlay dialog-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="card stack pop dialog" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {text && <p className="muted" style={{ margin: 0 }}>{text}</p>}
        <div className="grid-2">
          <button className="btn ghost" onClick={onCancel} autoFocus>{cancelLabel ?? t('Abbrechen')}</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmLabel ?? 'OK'}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * 🏠 Zurück zur Startseite – auf jedem Bildschirm. In einer laufenden Party (confirm)
 * fragt sie vorher nach; die Party läuft weiter und man kommt über „Zurück zur letzten Party“ wieder rein.
 */
export function HomeButton({ confirm = false, isHost = false }) {
  const [ask, setAsk] = useState(false);
  const go = () => navigate('/');
  return (
    <>
      <button className="btn ghost sm" title={t('Zur Startseite')} aria-label={t('Zur Startseite')}
        onClick={(e) => { e.stopPropagation(); if (confirm) setAsk(true); else go(); }}>🏠</button>
      {ask && (
        <ConfirmDialog
          title={t('Party wirklich verlassen?')}
          text={isHost
            ? t('Du bist der Host – ohne dich kann die Party nicht weitergehen. Über „Zurück zur letzten Party“ auf der Startseite kommst du jederzeit wieder rein.')
            : t('Die Party läuft ohne dich weiter. Über „Zurück zur letzten Party“ auf der Startseite kannst du jederzeit wieder einsteigen.')}
          confirmLabel={t('Verlassen')} cancelLabel={t('Bleiben')}
          onConfirm={go} onCancel={() => setAsk(false)} />
      )}
    </>
  );
}

export function LangSwitch({ full = false }) {
  const lang = useLang();
  if (full) {
    return (
      <div className="row" style={{ gap: 6 }}>
        {LANGS.map((l) => (
          <button key={l.id} className={`chip ${lang === l.id ? 'on' : ''}`} onClick={() => setLang(l.id)}>{l.flag} {l.label}</button>
        ))}
      </div>
    );
  }
  const next = LANGS.find((l) => l.id !== lang);
  return (
    <button className="btn ghost sm" title={next.label} onClick={() => setLang(next.id)}>
      🌐 {LANGS.find((l) => l.id === lang).id.toUpperCase()}
    </button>
  );
}
