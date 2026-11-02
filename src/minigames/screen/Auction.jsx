import { useState } from 'react';
import { GAMES } from '../../game/gameLibrary.js';
import { AUCTION, AUCTION_ITEMS, coinsLeft, itemsWon, bidOf } from '../../game/screen/auction.js';
import { L } from '../../game/screen/common.js';
import { submitResultField } from '../../game/groupEngine.js';
import { TvFrame, PadFrame, Timer, useNow, Booting, usePhaseSound } from './ui.jsx';
import { sfx, vibrate } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

const itemOf = (round, r) => AUCTION_ITEMS[round.game.items[r]];

/** Preiskurve: Höchstgebot je Runde. */
function PriceCurve({ history, big }) {
  const W = big ? 360 : 240; const H = big ? 150 : 100; const pad = 18; const padTop = 30;
  const max = Math.max(5, ...history.map((h) => h.top));
  const x = (i) => pad + (i / (AUCTION.rounds - 1)) * (W - pad * 2);
  const y = (v) => H - pad - (v / max) * (H - pad - padTop);
  const pts = history.map((h, i) => `${x(i)},${y(h.top)}`).join(' ');
  return (
    <svg width={W} height={H} className="price-curve">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,.3)" />
      {history.length > 1 && <polyline points={pts} fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinejoin="round" />}
      {history.map((h, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(h.top)} r="6" fill="#fbbf24" />
          <text x={x(i)} y={y(h.top) - 10} textAnchor="middle" fill="#fff" fontSize={big ? 15 : 11} fontWeight="900">{h.top}</text>
        </g>
      ))}
      {Array.from({ length: AUCTION.rounds }, (_, i) => <text key={i} x={x(i)} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,.6)" fontSize="11">{i + 1}</text>)}
    </svg>
  );
}

function Stage({ round, byId, big = true }) {
  const now = useNow(250);
  const sim = round.sim;
  usePhaseSound(sim ? `${sim.phase}:${sim.r}` : null, () => { if (sim?.phase === 'reveal') sfx.gavel(); else if (sim?.phase === 'bid') sfx.betJingle(); });
  if (!sim) return <Booting big={big} />;
  const item = itemOf(round, sim.r);
  const last = sim.phase === 'reveal' ? sim.history[sim.r] : null;
  const ids = round.participants;
  return (
    <TvFrame game={GAMES.auction} subtitle={t('Runde {a} von {b}', { a: sim.r + 1, b: AUCTION.rounds })}
      right={sim.phase !== 'done' && <Timer until={sim.endsAt} total={sim.phase === 'bid' ? AUCTION.bidMs : AUCTION.revealMs} now={now} size={big ? 74 : 54} />}>
      <div className="auction-main">
        <div className={`auction-item ${last ? 'sold' : ''}`}>
          <div className="auction-icon">{item.icon}</div>
          <div className="auction-name">{L(item.name)}</div>
          {last && (
            <div className="tv-banner good">
              🔨 {last.winners.length ? t('Zuschlag für {names} – {n} Münzen!', { names: last.winners.map((id) => byId[id]?.name).join(' & '), n: last.top }) : t('Kein Gebot – der Gegenstand bleibt im Auktionshaus.')}
            </div>
          )}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <div className="tv-sub">📈 {t('Preiskurve (Höchstgebote)')}</div>
          <PriceCurve history={sim.history} big={big} />
        </div>
      </div>
      <div className="auction-bidders">
        {ids.map((id) => {
          const bid = last ? last.bids[id] : null;
          const done = sim.phase === 'bid' && bidOf(round, sim, id) != null;
          const won = itemsWon(sim, id);
          return (
            <div key={id} className={`auction-bidder ${last?.winners.includes(id) ? 'win' : ''}`} style={{ '--c': byId[id]?.color }}>
              <span style={{ fontSize: big ? 32 : 22 }}>{byId[id]?.avatar}</span>
              <b>{byId[id]?.name}</b>
              <span className="auction-bid">{last ? `${bid} 🪙` : done ? `🔒 ${t('geboten')}` : '…'}</span>
              <span className="auction-won">{won.map((r) => itemOf(round, r).icon).join(' ') || '–'}</span>
            </div>
          );
        })}
      </div>
    </TvFrame>
  );
}

function Play({ code, round, me, run }) {
  const sim = round.sim;
  const [val, setVal] = useState(0);
  if (!sim) return <Booting />;
  const coins = coinsLeft(sim, me.id);
  const won = itemsWon(sim, me.id);
  const my = sim.phase === 'bid' ? bidOf(round, sim, me.id) : null;
  const item = itemOf(round, sim.r);
  const top = <div className="row between"><b>🪙 {t('{n} Münzen', { n: coins })}</b><span>{won.map((r) => itemOf(round, r).icon).join(' ') || t('noch nichts ersteigert')}</span></div>;
  let body;
  if (sim.phase === 'bid' && my == null) {
    const v = Math.min(val, coins);
    const set = (x) => { vibrate(10); setVal(Math.max(0, Math.min(coins, x))); };
    body = (
      <div className="stack center" style={{ gap: 12 }}>
        <div className="kicker">{item.icon} {L(item.name)}</div>
        <div className="auction-amount">{v} <small>🪙</small></div>
        <input type="range" min="0" max={coins} value={v} onChange={(e) => set(Number(e.target.value))} className="auction-range" />
        <div className="row" style={{ gap: 6, justifyContent: 'center' }}>
          {[-5, -1, 1, 5].map((d) => <button key={d} className="btn soft" onClick={() => set(v + d)}>{d > 0 ? `+${d}` : d}</button>)}
          <button className="btn soft" onClick={() => set(coins)}>{t('Alles')}</button>
        </div>
        <button className="btn primary lg block" onClick={() => { sfx.coins(); vibrate(40); run(() => submitResultField(code, round.id, me.id, `b${sim.r}`, v)); setVal(0); }}>
          🔒 {t('Geheim bieten: {n}', { n: v })}
        </button>
        <div className="small muted">{t('Gebote sind immer weg – auch wenn du nicht gewinnst.')}</div>
      </div>
    );
  } else if (sim.phase === 'bid') {
    body = <div className="pad-wait">🔒 {t('Dein Gebot: {n} – warte auf die anderen …', { n: my })}</div>;
  } else if (sim.phase === 'reveal') {
    const h = sim.history[sim.r];
    body = <div className="pad-wait">{h.winners.includes(me.id) ? `🎉 ${t('Zuschlag! {item} gehört dir.', { item: `${item.icon} ${L(item.name)}` })}` : `📺 ${t('Schau auf den Bildschirm!')}`}</div>;
  } else body = <div className="pad-wait">🔨 {t('Auktion beendet!')}</div>;
  return <PadFrame top={top}>{body}</PadFrame>;
}

export const Auction = { Play, Stage };
