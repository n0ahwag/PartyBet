import { useDocData } from '../hooks/useRoom.js';
import { BADGES, BADGE, crewHooks, nameKey } from '../game/crew.js';
import { WEEK_RULES } from '../game/weekly.js';
import { GAMES } from '../game/gameLibrary.js';
import { t } from '../i18n/index.js';

/** Satz für einen „Haken“ (crewHooks) in der aktuellen Sprache. */
function hookText(h, name) {
  if (h.type === 'streak') return `🔥 ${t('{name} hat {n}× in Folge gewonnen – wer stoppt die Serie?', { name: name(h.nk), n: h.n })}`;
  if (h.type === 'gap') return `🏁 ${h.n === 1 ? t('Nur noch 1 Sieg bis zum Gleichstand mit {name}!', { name: name(h.leader) }) : t('{n} Siege Rückstand auf {name} – hol sie dir!', { n: h.n, name: name(h.leader) })}`;
  if (h.type === 'h2h') {
    const d = h.vb - h.va;
    const base = `⚔️ ${name(h.a)} vs. ${name(h.b)}: ${h.va}:${h.vb}`;
    return d > 0 ? `${base} – ${t('noch {n} bis zum Ausgleich', { n: d })}` : d === 0 ? `${base} – ${t('alles offen!')}` : `${base} – ${t('knapp vorne!')}`;
  }
  if (h.type === 'badge') {
    const b = BADGE[h.badge];
    return `🎖️ ${t('Noch {n} bis zum Abzeichen {badge}', { n: h.missing, badge: `${b.icon} ${t(b.name)}` })}`;
  }
  return '';
}

/**
 * Crew-Bilanz am Ende einer Party: ewige Tabelle, Serien, knappe Duelle, neue Abzeichen
 * und was bis zum nächsten Abzeichen fehlt – der Grund für „noch eine Runde!“.
 */
export function CrewPanel({ room, players, me }) {
  const crew = useDocData(room?.crew?.id ? ['crews', room.crew.id] : null);
  if (!room?.crew?.id) return null;
  if (!crew) return <div className="crew-panel center muted">{t('Crew-Bilanz wird geladen …')}</div>;
  const name = (nk) => crew.names?.[nk] ?? nk;
  const myNk = me ? nameKey(me.name) : null;
  const table = Object.keys(crew.names || {})
    .filter((nk) => players.some((p) => nameKey(p.name) === nk))
    .map((nk) => ({ nk, wins: crew.wins?.[nk] ?? 0, badges: crew.badges?.[nk] || [] }))
    .sort((a, b) => b.wins - a.wins);
  const hooks = crewHooks(crew, myNk).slice(0, 3);
  const fresh = room.crew.newBadges || {};
  const myFresh = me ? fresh[me.id] || [] : Object.values(fresh).flat();
  return (
    <div className="crew-panel stack" onClick={(e) => e.stopPropagation()}>
      <div className="row between">
        <b>👥 {t('Eure Crew')} · {t('{n} Partys', { n: crew.parties ?? 0 })}</b>
        {crew.streak?.n >= 2 && <span className="pill">🔥 {name(crew.streak.nk)} ×{crew.streak.n}</span>}
      </div>
      {myFresh.length > 0 && (
        <div className="crew-new pop">
          <div className="small" style={{ fontWeight: 800 }}>{me ? t('Neues Abzeichen!') : t('Neue Abzeichen!')}</div>
          <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
            {myFresh.map((id) => <span key={id} className="badge-chip big">{BADGE[id].icon} {t(BADGE[id].name)}</span>)}
          </div>
        </div>
      )}
      <div className="stack" style={{ gap: 6 }}>
        {table.map((r, i) => (
          <div key={r.nk} className={`crew-row ${r.nk === myNk ? 'me' : ''}`}>
            <span className="crew-pos">{i === 0 && r.wins > 0 ? '👑' : `${i + 1}.`}</span>
            <b className="grow ellipsis">{name(r.nk)}</b>
            <span className="small" title={t('Abzeichen')}>🎖️ {r.badges.length}/{BADGES.length}</span>
            <span className="crew-wins">{t('{n} Siege', { n: r.wins })}</span>
          </div>
        ))}
      </div>
      {hooks.map((h, i) => <div key={i} className="crew-hook">{hookText(h, name)}</div>)}
      {me && (crew.badges?.[myNk] || []).length > 0 && (
        <div className="row wrap" style={{ gap: 6 }}>
          {(crew.badges[myNk]).map((id) => <span key={id} className="badge-chip" title={t(BADGE[id].desc)}>{BADGE[id].icon} {t(BADGE[id].name)}</span>)}
        </div>
      )}
    </div>
  );
}

/** Spiel der Woche & Wochen-Regel als kleine Karte (Lobby, Startseite). */
export function WeekCard({ week, compact = false }) {
  if (!week) return null;
  const rule = WEEK_RULES[week.rule];
  const game = GAMES[week.game];
  return (
    <div className={`card week-card ${compact ? 'compact' : ''}`}>
      <div className="kicker">📅 {t('Diese Woche')}</div>
      {game && <div><b>⭐ {t('Spiel der Woche')}: {game.icon} {t(game.name)}</b>{!compact && <div className="small muted">{t('Eröffnet jede Party und zählt doppelt (Spielfeld: Gold-Würfel für Platz 1).')}</div>}</div>}
      {rule && <div><b>{rule.icon} {t(rule.name)}</b>{!compact && <div className="small muted">{t(rule.desc)}</div>}</div>}
    </div>
  );
}

/** Rekord-Einblendung nach einer Runde + Wochen-Bestenliste des Spiels. */
export function RecordsPanel({ round, room, byId, meId }) {
  const key = room?.week?.key;
  const week = useDocData(key && round?.records ? ['weekRecords', key] : null);
  const recs = round?.records || {};
  const ids = Object.keys(recs);
  const list = week?.games?.[round.gameId] || [];
  const broken = ids.filter((id) => !recs[id].first && recs[id].prev != null);
  const mine = meId ? recs[meId] : null;
  if (!ids.length && !list.length) return null;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {mine && !mine.first && <div className="record-flash pop">🔥 {t('NEUER REKORD!')}<div className="small">{t('Dein alter Bestwert: {v}', { v: mine.prev })}</div></div>}
      {mine?.week === 1 && <div className="record-flash gold pop">📅 {t('Platz 1 der Wochen-Bestenliste!')}</div>}
      {!meId && broken.map((id) => <div key={id} className="record-line">🔥 {t('{name} knackt den eigenen Rekord!', { name: byId[id]?.name })} <span className="muted small">({t('vorher {v}', { v: recs[id].prev })})</span></div>)}
      {list.length > 0 && (
        <div className="card week-board">
          <b>🏆 {t('Wochen-Bestenliste')} · {t(GAMES[round.gameId]?.name)}</b>
          {list.map((e, i) => {
            const fresh = ids.some((id) => recs[id].week === i + 1 && byId[id] && nameKey(byId[id].name) === e.nk);
            return (
              <div key={e.nk} className={`row between week-row ${fresh ? 'fresh' : ''}`}>
                <span>{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} <b>{e.name}</b></span>
                <span className="small">{e.txt}{fresh ? ' 🆕' : ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


/** Hinweis zu Beginn einer Runde: Spiel der Woche, Jackpot, Underdog, Raketen … */
export function ModBanner({ mods }) {
  if (!mods) return null;
  const lines = [];
  if (mods.featured) lines.push(`⭐ ${t('Spiel der Woche – zählt doppelt!')}`);
  else if (mods.jackpot) lines.push(`💰 ${t('Jackpot-Runde – zählt doppelt!')}`);
  if (mods.bronzeLast) lines.push(`🐢 ${t('Underdog-Woche: der Letzte bekommt einen Trost-Bonus')}`);
  if (mods.rocket > 3) lines.push(`🚀 ${t('Raketen-Woche: Raketen bringen 5 Felder')}`);
  if (!lines.length) return null;
  return <div className="card mod-banner pop">{lines.map((l) => <b key={l}>{l}</b>)}</div>;
}
