import { PHASES } from '../game/constants.js';
import { BOARD_PHASES } from '../game/board.js';

export function PhaseOverlay({ phase, board = false }) {
  if (!phase) return null;
  const p = board ? { ...PHASES[phase], ...BOARD_PHASES[phase] } : PHASES[phase];
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
  if (room.gameMode === 'board') {
    return (
      <div className="row" style={{ gap: 8 }}>
        <span className="pill accent" style={{ background: p.accent }}>{BOARD_PHASES[room.phase].label}</span>
        <span className="pill">Runde {room.round}</span>
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
