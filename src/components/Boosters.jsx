import { useEffect, useState } from 'react';
import { POWERUPS, POWERUP_SOURCE } from '../game/constants.js';
import { t } from '../i18n/index.js';

/*
 * Power-up-Karten („Booster“): groß und verständlich – Kurzfassung, So funktioniert's,
 * wann einsetzbar und ein Rechenbeispiel. Dazu ein Info-Fenster mit allen Boostern.
 */

export const BOOSTER_COLORS = { shield: '#3B82F6', doubleDown: '#8B5CF6', sabotage: '#16A34A', joker: '#F97316' };

/** Eine Booster-Karte. onUse → Knopf „Einsetzen“ (bzw. „Ziel wählen“). */
export function BoosterCard({ p, count, onUse, open: initiallyOpen = true }) {
  const [open, setOpen] = useState(initiallyOpen);
  const color = BOOSTER_COLORS[p.id] ?? 'var(--accent)';
  return (
    <div className="booster-card" style={{ '--b': color }}>
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="booster-icon">{p.icon}</div>
        <div className="grow stack" style={{ gap: 2 }}>
          <div className="row between">
            <b style={{ fontSize: 18 }}>{t(p.label)}</b>
            {count != null && <span className="pill" style={{ background: color, color: '#fff' }}>×{count}</span>}
          </div>
          <div style={{ fontWeight: 700 }}>{t(p.desc)}</div>
        </div>
      </div>
      {open ? (
        <div className="stack" style={{ gap: 6, marginTop: 10 }}>
          <ul className="booster-how">{p.how.map((h) => <li key={h}>{t(h)}</li>)}</ul>
          <div className="small"><b>⏱ {t('Wann')}:</b> {t(p.when)}</div>
          <div className="booster-example small">💡 {t(p.example)}</div>
        </div>
      ) : (
        <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>ℹ️ {t("So funktioniert's")}</button>
      )}
      {onUse && (
        <button className="btn block" style={{ marginTop: 10, background: color, color: '#fff' }} onClick={onUse}>
          {p.target ? `🎯 ${t('Einsetzen – Ziel wählen')}` : `✨ ${t('Einsetzen')}`}
        </button>
      )}
    </div>
  );
}

/** Info-Fenster: alle Booster erklärt, mit der eigenen Anzahl. */
export function BoosterGuide({ inventory = {}, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay dialog-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="card stack pop dialog booster-guide" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2 style={{ margin: 0 }}>⚡ {t('Power-ups')}</h2>
          <button className="btn ghost sm" onClick={onClose} aria-label={t('Schließen')}>✕</button>
        </div>
        <p className="small muted" style={{ margin: 0, textAlign: 'left' }}>{t(POWERUP_SOURCE)}</p>
        {Object.values(POWERUPS).map((p) => <BoosterCard key={p.id} p={p} count={inventory[p.id] ?? 0} />)}
        <button className="btn primary block" onClick={onClose}>{t('Verstanden')}</button>
      </div>
    </div>
  );
}
