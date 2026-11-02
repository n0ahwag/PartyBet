import { makeRng } from '../../lib/random.js';
import { finishCoop } from './common.js';

/*
 * Raumschiff-Chaos (kooperativ): Jedes Handy ist ein anderes Schaltpult mit 4 Bedienelementen.
 * Auf jedem Handy erscheint ein Befehl – meist für ein Element, das ein ANDERER hat.
 * Also: laut vorlesen! Erledigte Befehle bringen das Schiff voran, verpasste kosten Hülle.
 *
 * Eingaben: results.{uid}.c = { [controlId]: Wert } (Schalter true/false, Regler 0–3, Knopf = Zähler)
 * Regie (sim): cmds = { uid: { ctl, val, base, until, n } }, hull, prog, goal
 */

export const SHIP = { timeMs: 100000, hull: 5, perPlayer: 6, cmdMs: 15000, minCmdMs: 8000, countMs: 3000, perPanel: 4 };

export const SHIP_CONTROLS = [
  { id: 'quantum', type: 'toggle', name: { de: 'Quanten-Kühler', en: 'Quantum cooler' } },
  { id: 'shield', type: 'toggle', name: { de: 'Schutzschild', en: 'Shield' } },
  { id: 'gravity', type: 'toggle', name: { de: 'Gurken-Gravitator', en: 'Pickle gravitator' } },
  { id: 'lights', type: 'toggle', name: { de: 'Disco-Beleuchtung', en: 'Disco lights' } },
  { id: 'toaster', type: 'toggle', name: { de: 'Warp-Toaster', en: 'Warp toaster' } },
  { id: 'sauna', type: 'toggle', name: { de: 'Bord-Sauna', en: 'Onboard sauna' } },
  { id: 'magnet', type: 'toggle', name: { de: 'Socken-Magnet', en: 'Sock magnet' } },
  { id: 'fog', type: 'toggle', name: { de: 'Nebelmaschine', en: 'Fog machine' } },
  { id: 'horn', type: 'button', name: { de: 'Hyper-Hupe', en: 'Hyper horn' } },
  { id: 'turbo', type: 'button', name: { de: 'Turbo-Zünder', en: 'Turbo igniter' } },
  { id: 'eject', type: 'button', name: { de: 'Müll-Auswurf', en: 'Trash ejector' } },
  { id: 'scan', type: 'button', name: { de: 'Asteroiden-Scan', en: 'Asteroid scan' } },
  { id: 'coffee', type: 'button', name: { de: 'Kaffee-Kanone', en: 'Coffee cannon' } },
  { id: 'ping', type: 'button', name: { de: 'Pinguin-Ping', en: 'Penguin ping' } },
  { id: 'reset', type: 'button', name: { de: 'Not-Neustart', en: 'Emergency reboot' } },
  { id: 'confetti', type: 'button', name: { de: 'Konfetti-Torpedo', en: 'Confetti torpedo' } },
  { id: 'plasma', type: 'slider', name: { de: 'Plasma-Pumpe', en: 'Plasma pump' } },
  { id: 'warp', type: 'slider', name: { de: 'Warp-Faktor', en: 'Warp factor' } },
  { id: 'bass', type: 'slider', name: { de: 'Bass-Verstärker', en: 'Bass booster' } },
  { id: 'oxygen', type: 'slider', name: { de: 'Sauerstoff-Regler', en: 'Oxygen valve' } },
  { id: 'wobble', type: 'slider', name: { de: 'Wackel-Dämpfer', en: 'Wobble damper' } },
  { id: 'cheese', type: 'slider', name: { de: 'Käse-Reaktor', en: 'Cheese reactor' } },
  { id: 'sonar', type: 'slider', name: { de: 'Delfin-Sonar', en: 'Dolphin sonar' } },
  { id: 'heat', type: 'slider', name: { de: 'Heizspirale', en: 'Heating coil' } },
];
export const CONTROL = Object.fromEntries(SHIP_CONTROLS.map((c) => [c.id, c]));

export const shipCreateState = (rng) => ({ seed: rng.int(1, 999999) });

/** Schaltpulte: uid → [controlId…] (gemischt: Schalter, Knöpfe, Regler). */
export function shipPanels(round) {
  const rng = makeRng(`ship:${round.game.seed}`);
  const per = Math.max(2, Math.min(SHIP.perPanel, Math.floor(SHIP_CONTROLS.length / round.participants.length)));
  const pool = rng.shuffle(SHIP_CONTROLS.map((c) => c.id));
  return Object.fromEntries(round.participants.map((id, i) => [id, pool.slice(i * per, i * per + per)]));
}

const DEFAULT = { toggle: false, button: 0, slider: 0 };

/** Aktueller Wert eines Bedienelements (beim Besitzer gespeichert). */
export function controlValue(round, panels, ctl) {
  const owner = Object.keys(panels).find((id) => panels[id].includes(ctl));
  const v = owner ? round.results?.[owner]?.c?.[ctl] : undefined;
  return v ?? DEFAULT[CONTROL[ctl].type];
}

function newCommand(round, panels, sim, uid, now) {
  const rng = makeRng(`ship:${round.game.seed}:${sim.n}:${uid}`);
  const busy = new Set(Object.values(sim.cmds || {}).map((c) => c.ctl));
  const own = panels[uid] || [];
  const others = Object.entries(panels).filter(([id]) => id !== uid).flatMap(([, c]) => c);
  // meist ein fremdes Element → man muss es laut ansagen
  const from = others.length && rng.next() < 0.75 ? others : own;
  const options = from.filter((c) => !busy.has(c));
  const ctl = rng.pick(options.length ? options : from);
  const type = CONTROL[ctl].type;
  const cur = controlValue(round, panels, ctl);
  let val;
  if (type === 'toggle') val = !cur;
  else if (type === 'slider') val = rng.pick([0, 1, 2, 3].filter((x) => x !== cur));
  else val = true;
  const ms = Math.max(SHIP.minCmdMs, SHIP.cmdMs - sim.prog * 350);
  return { ctl, val, base: type === 'button' ? cur : 0, until: now + ms, ms, n: sim.n };
}

export function commandDone(round, panels, cmd) {
  const v = controlValue(round, panels, cmd.ctl);
  return CONTROL[cmd.ctl].type === 'button' ? v > cmd.base : v === cmd.val;
}

export const shipDirector = {
  start(round, now) {
    return { phase: 'count', startAt: now + SHIP.countMs, endsAt: now + SHIP.countMs + SHIP.timeMs, hull: SHIP.hull, prog: 0, goal: SHIP.perPlayer * round.participants.length, cmds: {}, n: 0, ok: 0, fail: 0, fx: null };
  },
  tick(sim, round, now) {
    const panels = shipPanels(round);
    if (sim.phase === 'count') {
      if (now < sim.startAt) return { sim };
      let s = { ...sim, phase: 'run', cmds: {} };
      for (const id of round.participants) { s = { ...s, n: s.n + 1 }; s.cmds = { ...s.cmds, [id]: newCommand(round, panels, s, id, now) }; }
      return { sim: s };
    }
    if (sim.phase !== 'run') return { sim };
    let s = sim;
    for (const id of round.participants) {
      const cmd = s.cmds[id];
      if (!cmd) continue;
      const ok = commandDone(round, panels, cmd);
      if (!ok && now < cmd.until) continue;
      s = ok
        ? { ...s, prog: s.prog + 1, ok: s.ok + 1, fx: { t: 'ok', at: now, by: id } }
        : { ...s, hull: s.hull - 1, fail: s.fail + 1, fx: { t: 'hit', at: now, by: id } };
      s = { ...s, n: s.n + 1 };
      s = { ...s, cmds: { ...s.cmds, [id]: newCommand(round, panels, s, id, now) } };
    }
    const win = s.prog >= s.goal;
    if (win || s.hull <= 0 || now >= s.endsAt) {
      const final = { ...s, phase: 'done', win };
      return { sim: final, done: shipResult(round, final) };
    }
    return { sim: s };
  },
};

export function shipResult(round, sim) {
  const p = sim.prog / sim.goal;
  const pts = sim.win ? 3 : p >= 0.5 ? 2 : p >= 0.25 ? 1 : 0;
  return finishCoop(round, pts, { shipWin: !!sim.win, shipProgress: Math.round(Math.min(1, p) * 100), shipOk: sim.ok, shipFail: sim.fail });
}
