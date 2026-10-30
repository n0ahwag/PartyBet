import { useLocalCountdown } from '../hooks/useCountdown.js';
import { sfx } from '../lib/sound.js';
import { t } from '../i18n/index.js';

/** Großer 3-2-1-Countdown mit Sounds. */
export function useGo(active, onDone) {
  return useLocalCountdown(active, 3, () => sfx.tick(), () => { sfx.go(); onDone?.(); });
}

export function CountdownView({ n }) {
  return <div className="countdown-big center pop" key={n}>{n}</div>;
}

export function Waiting({ text }) {
  return <div className="card flat center muted" style={{ fontWeight: 700 }}>{text}</div>;
}

export function Rules({ game }) {
  return (
    <div className="card tinted stack" style={{ gap: 6 }}>
      <h3>{t('Regeln')}</h3>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{t(game.rules)}</p>
    </div>
  );
}
