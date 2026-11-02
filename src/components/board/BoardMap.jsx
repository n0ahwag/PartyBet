import { useEffect, useRef, useState } from 'react';
import { Board3D as BoardSvg } from './Board3D.jsx';
import { MAP_INFO, mapIdOf } from '../../game/maps/defs.js';
import { effectiveFields } from '../../game/board.js';
import { t } from '../../i18n/index.js';

/*
 * Lebendige 3D-Karte (Three.js, nachgeladen). Fällt auf die einfache SVG-Karte zurück,
 * falls das Gerät kein WebGL kann.
 *
 * compact: Handy – Kamera folgt der eigenen Figur · follow: Hauptbildschirm – Kamera folgt dem Geschehen
 * preview: Lobby – ganze Karte
 */
const lowPowerDevice = () => (navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) <= 3;

export function BoardMap({ fields, cleared = [], players, positions, theme, meId = null, compact = false, follow = false, fill = false, reserve = 330, focus = null }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const ctl = useRef(null);
  const [state, setState] = useState('loading'); // loading | ready | failed
  const [fit, setFit] = useState(!(compact || follow));
  const mapId = mapIdOf(theme);
  const sig = `${mapId}:${fields.join(',')}`;

  const leaderPos = Math.max(0, ...players.map((p) => positions[p.id] ?? 0));
  const focusId = focus ?? meId ?? players.find((p) => (positions[p.id] ?? 0) === leaderPos)?.id;
  const focusField = positions[focusId] ?? 0;
  const latest = useRef({});
  latest.current = { players, positions, meId, focusField, fit, cleared };

  useEffect(() => {
    let dead = false;
    setState('loading');
    import('../../game/maps/scene3d.js').then(({ createMapScene }) => {
      if (dead || !wrap.current || !canvas.current) return;
      const el = wrap.current;
      try {
        const c = createMapScene({ canvas: canvas.current, width: el.clientWidth || 360, height: el.clientHeight || 300, mapId, fields, lowPower: lowPowerDevice() });
        ctl.current = c;
        const L = latest.current;
        c.setPlayers(L.players, L.positions, L.meId);
        c.setCleared(L.cleared);
        c.setFocus(L.focusField);
        c.setMode(L.fit ? 'overview' : 'follow');
        setState('ready');
      } catch (e) {
        console.warn('3D-Karte nicht verfügbar', e);
        setState('failed');
      }
    }).catch(() => !dead && setState('failed'));
    const ro = new ResizeObserver(() => { const el = wrap.current; if (ctl.current && el?.clientWidth) ctl.current.resize(el.clientWidth, el.clientHeight); });
    if (wrap.current) ro.observe(wrap.current);
    return () => { dead = true; ro.disconnect(); ctl.current?.dispose(); ctl.current = null; };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { ctl.current?.setPlayers(players, positions, meId); }, [players, positions, meId, state]);
  useEffect(() => { ctl.current?.setCleared(cleared); }, [cleared.join(','), state]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { ctl.current?.setFocus(focusField); }, [focusField, state]);
  useEffect(() => { ctl.current?.setMode(fit ? 'overview' : 'follow'); }, [fit, state]);

  if (state === 'failed') {
    return <BoardSvg fields={effectiveFields(fields, cleared)} players={players} positions={positions} meId={meId} compact={compact} follow={follow} reserve={reserve} focus={focus} seed={theme} />;
  }
  const height = fill ? '100%' : compact ? `clamp(300px, calc(100dvh - ${reserve}px), 560px)` : follow ? '68vh' : undefined;
  return (
    <div className={`board-map ${compact ? 'compact' : ''}`} style={{ height, aspectRatio: height ? undefined : '4 / 3' }} ref={wrap}>
      <canvas key={sig} ref={canvas} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }} aria-label={t('Spielfeld')} />
      <div className="board-map-name">{MAP_INFO[mapId].icon} {t(MAP_INFO[mapId].label)}</div>
      {(compact || follow) && (
        <button className="board3d-fit" onClick={() => setFit((v) => !v)}>{fit ? `🔍 ${t('Heranzoomen')}` : `🗺️ ${t('Ganzes Feld')}`}</button>
      )}
      {state === 'loading' && <div className="board-map-loading">🗺️ {t('Karte wird geladen…')}</div>}
    </div>
  );
}
