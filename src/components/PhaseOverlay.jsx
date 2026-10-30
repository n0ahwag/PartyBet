import { PHASES } from '../game/constants.js';
import { BOARD_PHASES } from '../game/board.js';
import { GROUP_PHASES } from '../game/group.js';

export function PhaseOverlay({ phase, mode = 'party' }) {
  if (!phase) return null;
  const texts = mode === 'board' ? BOARD_PHASES : mode === 'group' ? GROUP_PHASES : null;
  const board = !!texts; // eigene Titel statt CHAOS!/SUDDEN DEATH
  const p = texts ? { ...PHASES[phase], ...texts[phase] } : PHASES[phase];
  if (phase === 'chaos') {
    return (
      <div className="overlay phase-alarm">
        <div className="stack center">
          <div style={{ fontSize: 72 }}>🚨</div>
          <div className="title">{board ? p.title : 'CHAOS!'}</div>
          <div className="sub">{p.tagline}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="overlay phase-doom">
      <div className="stack center">
        <div style={{ fontSize: 72 }}>💀</div>
        <div className="title">{board ? p.title : 'SUDDEN DEATH'}</div>
        <div className="sub">{p.tagline}</div>
      </div>
    </div>
  );
}

export function PhaseBadge({ room }) {
  if (!room || room.status !== 'playing') return null;
  const p = PHASES[room.phase];
  if (room.gameMode === 'board' || room.gameMode === 'group') {
    const texts = room.gameMode === 'board' ? BOARD_PHASES : GROUP_PHASES;
    return (
      <div className="row" style={{ gap: 8 }}>
        <span className="pill accent" style={{ background: p.accent }}>{texts[room.phase].label}</span>
        <span className="pill">Runde {room.round}{room.gameMode === 'group' ? `/${room.totalRounds}` : ''}</span>
      </div>
    );
  }
  return (
    <div className="row" style={{ gap: 8 }}>
      <span className="pill accent" style={{ background: p.accent }}>{p.label}</span>
      <span className="pill">Runde {room.round}/{room.totalRounds}</span>
      {p.multiplier > 1 && <span className="pill">×{p.multiplier} Einsätze</span>}
    </div>
  );
}
