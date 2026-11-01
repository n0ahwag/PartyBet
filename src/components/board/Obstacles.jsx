import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sfx, vibrate } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

/*
 * Proben an Hindernissen – erscheinen am Handy, sobald die eigene Figur dort ankommt:
 *  ⬇️ Ducken: Wenn „DUCKEN!“ erscheint, sofort tippen oder nach unten wischen.
 *  🦘 Kaputte Brücke: Tippen, wenn der Springer im grünen Bereich ist.
 */

const DUCK_WINDOW = 1000;

function Shell({ color, icon, title, text, children }) {
  // Portal: Vollbild auch innerhalb animierter Karten (transform würde fixed sonst einsperren)
  return createPortal(
    <div className="overlay obstacle-overlay" style={{ '--o': color }}>
      <div className="stack center" style={{ gap: 12, width: '100%', maxWidth: 440 }}>
        <div style={{ fontSize: 64, lineHeight: 1 }}>{icon}</div>
        <div className="obstacle-title">{title}</div>
        {text && <div className="obstacle-text">{text}</div>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DuckChallenge({ onDone }) {
  const [phase, setPhase] = useState('intro'); // intro | wait | go | ok | fail
  const [why, setWhy] = useState('');
  const goAt = useRef(0);
  const done = useRef(false);
  const startY = useRef(null);

  const finish = (ok, reason = '') => {
    if (done.current) return;
    done.current = true;
    setWhy(reason);
    setPhase(ok ? 'ok' : 'fail');
    if (ok) { sfx.tusch(); vibrate(40); } else { sfx.fail(); vibrate([200, 80, 200]); }
    setTimeout(() => onDone(ok), 1500);
  };

  useEffect(() => {
    if (phase === 'intro') { const tm = setTimeout(() => setPhase('wait'), 2200); return () => clearTimeout(tm); }
    if (phase === 'wait') { const tm = setTimeout(() => { goAt.current = performance.now(); setPhase('go'); sfx.alarm?.(); vibrate(120); }, 900 + Math.random() * 1700); return () => clearTimeout(tm); }
    if (phase === 'go') { const tm = setTimeout(() => finish(false, t('Zu langsam!')), DUCK_WINDOW); return () => clearTimeout(tm); }
    return undefined;
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = () => {
    if (phase === 'wait') finish(false, t('Zu früh geduckt!'));
    else if (phase === 'go') finish(true);
  };
  const title = phase === 'go' ? t('DUCKEN!') : phase === 'ok' ? t('Geschafft!') : phase === 'fail' ? t('Autsch!') : t('Ein Balken schwingt heran!');
  return (
    <Shell color={phase === 'go' ? '#DC2626' : '#0EA5E9'} icon={phase === 'ok' ? '😎' : phase === 'fail' ? '🤕' : '⬇️'} title={title}
      text={phase === 'intro' ? t('Sobald „DUCKEN!“ erscheint: sofort auf das Feld tippen oder nach unten wischen. Nicht zu früh!')
        : phase === 'ok' ? t('Du duckst dich rechtzeitig unter dem Balken durch.') : phase === 'fail' ? `${why} ${t('Du bleibst vor dem Balken stehen.')}` : null}>
      {(phase === 'wait' || phase === 'go' || phase === 'intro') && (
        <div className={`duck-pad ${phase === 'go' ? 'go' : ''}`} style={{ touchAction: 'none' }}
          onPointerDown={(e) => { startY.current = e.clientY; if (phase !== 'intro') act(); }}
          onPointerMove={(e) => { if (startY.current != null && e.clientY - startY.current > 40 && phase !== 'intro') act(); }}
          onPointerUp={() => { startY.current = null; }}>
          {phase === 'go' ? `⬇️ ${t('JETZT!')}` : phase === 'wait' ? `👀 ${t('Achtung …')}` : `⏳ ${t('Gleich geht’s los')}`}
        </div>
      )}
    </Shell>
  );
}

export function JumpChallenge({ onDone }) {
  const [phase, setPhase] = useState('intro'); // intro | run | ok | fail
  const [x, setX] = useState(0);
  const xRef = useRef(0);
  const done = useRef(false);
  const ZONE = [0.4, 0.62];

  useEffect(() => {
    if (phase === 'intro') { const tm = setTimeout(() => setPhase('run'), 2000); return () => clearTimeout(tm); }
    if (phase !== 'run') return undefined;
    const t0 = performance.now(); let raf = 0;
    const loop = (now) => {
      const u = ((now - t0) / 1250) % 2; const v = u < 1 ? u : 2 - u;
      xRef.current = v; setX(v);
      if (now - t0 > 9000) { finish(false); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (ok) => {
    if (done.current) return;
    done.current = true;
    setPhase(ok ? 'ok' : 'fail');
    if (ok) { sfx.tusch(); vibrate(40); } else { sfx.fail(); vibrate([250, 80, 250]); }
    setTimeout(() => onDone(ok), 1600);
  };
  const tap = () => { if (phase === 'run') finish(xRef.current >= ZONE[0] && xRef.current <= ZONE[1]); };

  return (
    <Shell color="#DC2626" icon={phase === 'ok' ? '🦘' : phase === 'fail' ? '😱' : '🌉'}
      title={phase === 'ok' ? t('Gesprungen!') : phase === 'fail' ? t('Abgestürzt!') : t('Die Brücke ist kaputt!')}
      text={phase === 'intro' ? t('Spring über die Lücke: Tippe, wenn der Springer im grünen Bereich ist.')
        : phase === 'ok' ? t('Du landest sicher auf der anderen Seite.') : phase === 'fail' ? t('Du fällst durch die Lücke – 3 Felder zurück.') : null}>
      {(phase === 'run' || phase === 'intro') && (
        <div className="jump-pad" onPointerDown={tap} style={{ touchAction: 'none' }}>
          <div className="jump-bar">
            <div className="jump-zone" style={{ left: `${ZONE[0] * 100}%`, width: `${(ZONE[1] - ZONE[0]) * 100}%` }} />
            <div className="jump-marker" style={{ left: `${x * 100}%` }}>🦘</div>
          </div>
          <b>{phase === 'run' ? `👆 ${t('Tippen zum Springen!')}` : t('Gleich geht’s los …')}</b>
        </div>
      )}
    </Shell>
  );
}
