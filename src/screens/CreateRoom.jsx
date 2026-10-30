import { useMemo, useState } from 'react';
import { EQUIPMENT } from '../game/constants.js';
import { filterLibrary } from '../game/gameLibrary.js';
import { createRoom, joinRoom } from '../game/engine.js';
import { navigate } from '../lib/router.js';
import { detectCaps } from '../lib/device.js';
import { AVATARS } from '../game/constants.js';
import { useToast, useAction } from '../components/ui.jsx';

export function CreateRoom({ uid }) {
  const [mode, setMode] = useState('screen');
  const [count, setCount] = useState(4);
  const [equipment, setEquipment] = useState([]);
  const [rounds, setRounds] = useState(8);
  const [liveEvents, setLiveEvents] = useState(true);
  const [name, setName] = useState(localStorage.getItem('fo_name') || '');
  const [toast, toastNode] = useToast();
  const [run, busy] = useAction(toast);

  const library = useMemo(() => filterLibrary({ playerCount: count, equipment }), [count, equipment]);
  const toggle = (id) => setEquipment((eq) => (eq.includes(id) ? eq.filter((e) => e !== id) : [...eq, id]));

  const create = () => run(async () => {
    const code = await createRoom({ hostId: uid, mode, expectedPlayers: count, equipment, totalRounds: rounds, liveEvents });
    if (mode === 'mobile') {
      localStorage.setItem('fo_name', name);
      await joinRoom(code, uid, { name, avatar: AVATARS[0], caps: detectCaps() });
      localStorage.setItem('fo_last', `/play/${code}`);
      navigate(`/play/${code}`);
    } else {
      localStorage.setItem('fo_last', `/host/${code}`);
      navigate(`/host/${code}`);
    }
  });

  return (
    <div className="page">
      <div className="row between">
        <button className="btn ghost sm" onClick={() => navigate('/')}>←</button>
        <h2>Party erstellen</h2>
        <span style={{ width: 40 }} />
      </div>

      <div className="card stack">
        <h3>Host-Modus</h3>
        <div className="grid-2">
          <button className={`chip ${mode === 'screen' ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 16, borderRadius: 18 }} onClick={() => setMode('screen')}>
            <span style={{ fontSize: 30 }}>📺</span>Hauptbildschirm
            <span className="small muted" style={{ fontWeight: 500 }}>Laptop/TV + Handys als Controller</span>
          </button>
          <button className={`chip ${mode === 'mobile' ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 16, borderRadius: 18 }} onClick={() => setMode('mobile')}>
            <span style={{ fontSize: 30 }}>📱</span>Nur Handys
            <span className="small muted" style={{ fontWeight: 500 }}>Raumcode, du hostest mit</span>
          </button>
        </div>
        {mode === 'mobile' && <input className="input" placeholder="Dein Name" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />}
      </div>

      <div className="card stack">
        <h3>Spieleranzahl</h3>
        <div className="stepper" style={{ justifyContent: 'center' }}>
          <button onClick={() => setCount((c) => Math.max(2, c - 1))}>−</button>
          <div className="value">{count}</div>
          <button onClick={() => setCount((c) => Math.min(12, c + 1))}>+</button>
        </div>
      </div>

      <div className="card stack">
        <h3>Vorhandene Utensilien</h3>
        <div className="row wrap">
          {EQUIPMENT.map((e) => (
            <button key={e.id} className={`chip ${equipment.includes(e.id) ? 'on' : ''}`} onClick={() => toggle(e.id)}>{e.icon} {e.label}</button>
          ))}
          <button className={`chip ${equipment.length === 0 ? 'on' : ''}`} onClick={() => setEquipment([])}>🙅 Gar nichts</button>
        </div>
        <div className="card flat tinted stack" style={{ gap: 8, padding: 14 }}>
          <b>{library.length} Spiele verfügbar</b>
          <div className="row wrap" style={{ gap: 6 }}>
            {library.map((g) => <span key={g.id} className="pill" style={{ background: `color-mix(in srgb, ${g.accent} 16%, var(--card))` }}>{g.icon} {g.name}</span>)}
          </div>
          {count < 3 && <p className="small muted" style={{ margin: 0 }}>Farb-Sprint & Schätz-Duell brauchen mind. 3 Spieler.</p>}
        </div>
      </div>

      <div className="card stack">
        <h3>Anzahl Duelle</h3>
        <div className="stepper" style={{ justifyContent: 'center' }}>
          <button onClick={() => setRounds((r) => Math.max(3, r - 1))}>−</button>
          <div className="value">{rounds}</div>
          <button onClick={() => setRounds((r) => Math.min(30, r + 1))}>+</button>
        </div>
        <p className="small muted center" style={{ margin: 0 }}>
          Warm-up: {Math.max(1, Math.ceil((rounds - 1) * 0.5))} · Chaos: {rounds - 1 - Math.max(1, Math.ceil((rounds - 1) * 0.5))} · Sudden Death: 1
        </p>
      </div>

      <div className="card row">
        <div className="grow">
          <b>⚡ Spontane Live-Events</b>
          <div className="small muted">Zwischen den Duellen unerwartete Vollbild-Alarme – der Langsamste trinkt 5 Schlücke.</div>
        </div>
        <button className={`chip ${liveEvents ? 'on' : ''}`} onClick={() => setLiveEvents((v) => !v)}>{liveEvents ? 'An' : 'Aus'}</button>
      </div>

      <button className="btn primary lg block" disabled={busy || !uid || (mode === 'mobile' && !name.trim())} onClick={create}>Raum erstellen</button>
      {toastNode}
    </div>
  );
}
