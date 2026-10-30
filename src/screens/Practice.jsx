import { useEffect, useMemo, useRef, useState } from 'react';
import { GAMES, CATEGORIES, requirementsOf } from '../game/gameLibrary.js';
import { EQUIPMENT } from '../game/constants.js';
import { MINIGAMES } from '../minigames/index.js';
import { Rules } from '../minigames/shared.jsx';
import { makeRng } from '../lib/random.js';
import { navigate } from '../lib/router.js';
import { sfx } from '../lib/sound.js';

/*
 * Übungsmodus: ein einzelnes Duell lokal auf diesem Gerät – ohne Raum, ohne Firebase.
 *  - Host-Spiele: Spielansicht + "Wer hat gewonnen?"
 *  - Geteiltes Gerät (Speed-Tap): beide spielen gleichzeitig
 *  - Eigene Handys: Hot-Seat – erst Spieler 1, dann Handy weitergeben an Spieler 2
 */

const A = 'p1';
const B = 'p2';

function newDuel(game) {
  const rng = makeRng(`practice:${game.id}:${Date.now()}`);
  return {
    id: 'practice', gameId: game.id, round: 0, phase: 'warmup', stage: 'playing',
    game: game.createState(rng, { phase: 'warmup' }),
    playerA: A, playerB: B, results: {}, sabotage: null,
  };
}

export function Practice({ gameId }) {
  const game = GAMES[gameId];
  const [names, setNames] = useState(() => [localStorage.getItem('fo_name') || 'Spieler 1', 'Spieler 2']);
  const [duel, setDuelState] = useState(null);
  const duelRef = useRef(null);
  const setDuel = (d) => { duelRef.current = d; setDuelState(d); };
  const [turn, setTurn] = useState(null); // A | B | handover | result
  const [winner, setWinner] = useState(undefined);

  useEffect(() => {
    if (game) document.documentElement.style.setProperty('--accent', game.accent);
  }, [game]);

  const byId = useMemo(() => ({
    [A]: { id: A, name: names[0] || 'Spieler 1', avatar: '🔵', color: '#3B82F6' },
    [B]: { id: B, name: names[1] || 'Spieler 2', avatar: '🔴', color: '#EF4444' },
  }), [names]);

  if (!game) return <div className="page center"><h2>Spiel nicht gefunden</h2><button className="btn" onClick={() => navigate('/library')}>Bibliothek</button></div>;
  const mg = MINIGAMES[game.id];

  const start = () => {
    setDuel(newDuel(game));
    setWinner(undefined);
    setTurn(game.devices === 'own' ? 'readyA' : A);
  };

  const finish = (d, w) => {
    setWinner(w === undefined ? game.decide?.(d) ?? null : w);
    setTurn('result');
    sfx.tusch();
  };

  const submit = (key, data) => {
    const d = duelRef.current;
    const next = { ...d, results: { ...d.results, [key]: data } };
    setDuel(next);
    if (game.devices === 'shared') setTimeout(() => finish(next), 1200);
    else if (key === A) setTimeout(() => setTurn('readyB'), 900);
    else setTimeout(() => finish(next), 900);
  };

  // ---------- Übersicht ----------
  if (!duel) {
    const equipment = EQUIPMENT.filter((e) => game.equipment.includes(e.id));
    return (
      <div className="page">
        <div className="row between">
          <button className="btn ghost sm" onClick={() => navigate('/library')}>←</button>
          <span className="pill">{CATEGORIES[game.kind]?.icon} {CATEGORIES[game.kind]?.label}</span>
        </div>
        <div className="game-title">
          <div className="icon">{game.icon}</div>
          <h2 style={{ fontSize: 28 }}>{game.name}</h2>
        </div>
        <Rules game={game} />
        <div className="row wrap" style={{ gap: 6 }}>
          {requirementsOf(game).map((r) => <span key={r} className="pill">{r}</span>)}
          {equipment.map((e) => <span key={e.id} className="pill">{e.icon} {e.label}</span>)}
          <span className="pill">{game.judge === 'auto' ? '🤖 App wertet aus' : '👀 Ihr entscheidet'}</span>
        </div>
        <div className="card stack">
          <h3>Übungsmodus</h3>
          <p className="small muted" style={{ margin: 0 }}>
            {game.devices === 'own'
              ? 'Ihr spielt nacheinander auf diesem Gerät und gebt es dazwischen weiter.'
              : game.devices === 'shared' ? 'Ihr spielt gleichzeitig auf diesem Gerät.' : 'Spielt in echt – die App zeigt die Aufgabe, ihr tragt den Gewinner ein.'}
          </p>
          <div className="grid-2">
            {[0, 1].map((i) => (
              <input key={i} className="input" style={{ fontSize: 16 }} maxLength={16} value={names[i]}
                onChange={(e) => setNames((n) => n.map((x, j) => (j === i ? e.target.value : x)))} />
            ))}
          </div>
          <button className="btn primary lg block" onClick={start}>▶️ Spielen</button>
        </div>
      </div>
    );
  }

  const header = (
    <div className="row between">
      <button className="btn ghost sm" onClick={() => setDuel(null)}>✕</button>
      <b>{game.icon} {game.name}</b>
      <span className="pill">Übung</span>
    </div>
  );

  // ---------- Ergebnis ----------
  if (turn === 'result') {
    const w = byId[winner];
    return (
      <div className="page">
        {header}
        <div className="card accent center pop"><h2 style={{ fontSize: 28 }}>{w ? `${w.avatar} ${w.name} gewinnt!` : 'Unentschieden!'}</h2></div>
        {mg.Review && <mg.Review duel={duel} byId={byId} big={false} />}
        <button className="btn primary lg block" onClick={start}>🔁 Nochmal</button>
        <button className="btn ghost block" onClick={() => navigate('/library')}>Zur Bibliothek</button>
      </div>
    );
  }

  // ---------- Hot-Seat-Übergaben ----------
  if (turn === 'readyA' || turn === 'readyB') {
    const p = byId[turn === 'readyA' ? A : B];
    return (
      <div className="page" style={{ justifyContent: 'center' }}>
        {header}
        <div className="card center stack pop">
          <div style={{ fontSize: 64 }}>{p.avatar}</div>
          <h2>{turn === 'readyB' ? `Gib das Gerät an ${p.name}` : `${p.name} ist dran`}</h2>
          <p className="muted" style={{ margin: 0 }}>Nur {p.name} schaut jetzt hin! 🙈</p>
        </div>
        <button className="btn primary lg block" onClick={() => setTurn(turn === 'readyA' ? A : B)}>Los geht's</button>
      </div>
    );
  }

  // ---------- Spielen ----------
  const me = byId[turn];
  // Bei Hot-Seat das Ergebnis des Vorgängers verbergen (außer das Spiel baut darauf auf)
  const visibleDuel = game.devices === 'own' && !game.sequential ? { ...duel, results: {} } : duel;
  return (
    <div className="page">
      {header}
      {game.devices === 'own' && <span className="pill accent" style={{ alignSelf: 'center' }}>{me.avatar} {me.name} spielt</span>}
      <mg.Play key={turn} duel={visibleDuel} me={me} byId={byId} submit={(k, data) => submit(k ?? me.id, data)} />
      {game.judge === 'host' && (
        <div className="card stack">
          <h3>Wer hat gewonnen?</h3>
          <div className="grid-2">
            {[A, B].map((id) => <button key={id} className="btn primary" onClick={() => finish(duel, id)}>{byId[id].avatar} {byId[id].name}</button>)}
          </div>
          <button className="btn ghost sm" onClick={() => finish(duel, null)}>Unentschieden</button>
        </div>
      )}
    </div>
  );
}
