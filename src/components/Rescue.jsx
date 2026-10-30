import { useState } from 'react';
import { RESCUE_OPTIONS } from '../game/constants.js';
import { requestRescue, answerLoan, resolveRescue } from '../game/engine.js';
import { Avatar } from './ui.jsx';
import { t } from '../i18n/index.js';

/** Pleite-Bildschirm des Spielers: Rettungsoptionen wählen. */
export function BankruptPanel({ code, me, players, rescues, run }) {
  const [loanFrom, setLoanFrom] = useState(null);
  const [amount, setAmount] = useState(3);
  const mine = rescues.filter((r) => r.playerId === me.id);
  const open = mine.find((r) => ['pending', 'asked', 'accepted'].includes(r.status));
  const lenders = players.filter((p) => p.id !== me.id && p.balance > 1);

  if (open) {
    const opt = RESCUE_OPTIONS[open.type];
    return (
      <div className="card stack center" style={{ borderColor: 'var(--bad)' }}>
        <div style={{ fontSize: 48 }}>{opt.icon}</div>
        <h2>{t(opt.label)}</h2>
        {open.prompt && <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>„{t(open.prompt)}“</p>}
        {open.type === 'video' && (
          <label className="btn soft">
            🎥 {t('Kamera öffnen')}
            <input type="file" accept="video/*" capture="user" style={{ display: 'none' }} />
          </label>
        )}
        <p className="muted small" style={{ margin: 0 }}>
          {open.status === 'asked' && t('Warte auf Antwort von {name}…', { name: players.find((p) => p.id === open.lenderId)?.name })}
          {open.status === 'accepted' && t('Zugesagt! Der Host bucht gleich um.')}
          {open.status === 'pending' && t('Der Host bestätigt, wenn du es erledigt hast.')}
        </p>
      </div>
    );
  }

  if (loanFrom) {
    const lender = players.find((p) => p.id === loanFrom);
    return (
      <div className="card stack">
        <h3>{t('Kredit bei {name}', { name: lender?.name })}</h3>
        <div className="stepper" style={{ justifyContent: 'center' }}>
          <button onClick={() => setAmount((a) => Math.max(1, a - 1))}>−</button>
          <div className="value">{amount}</div>
          <button onClick={() => setAmount((a) => Math.min(lender?.balance ?? 1, a + 1))}>+</button>
        </div>
        <p className="center small muted" style={{ margin: 0 }}>{t('Rückzahlung: {n} aus deinen nächsten Gewinnen', { n: Math.ceil(amount * 1.5) })}</p>
        <button className="btn primary" onClick={() => run(async () => { await requestRescue(code, me.id, 'loan', { lenderId: loanFrom, amount }); setLoanFrom(null); })}>{t('Anfragen')}</button>
        <button className="btn ghost sm" onClick={() => setLoanFrom(null)}>{t('Zurück')}</button>
      </div>
    );
  }

  return (
    <div className="card stack" style={{ borderColor: 'var(--bad)' }}>
      <div className="center">
        <div style={{ fontSize: 52 }}>💸</div>
        <h2>{t('Pleite!')}</h2>
        <p className="muted" style={{ margin: 0 }}>{t('0 Schlücke. Rette dich:')}</p>
      </div>
      {Object.values(RESCUE_OPTIONS).filter((o) => o.id !== 'loan').map((o) => (
        <button key={o.id} className="btn soft" style={{ justifyContent: 'flex-start', textAlign: 'left' }}
          onClick={() => run(() => requestRescue(code, me.id, o.id))}>
          <span style={{ fontSize: 26 }}>{o.icon}</span>
          <span className="grow"><div>{t(o.label)} (+{o.reward})</div><div className="small muted" style={{ fontWeight: 500 }}>{t(o.desc)}</div></span>
        </button>
      ))}
      <h3 style={{ marginTop: 6 }}>🤝 {t('Kredit bei…')}</h3>
      <div className="row wrap">
        {lenders.map((p) => <button key={p.id} className="chip" onClick={() => setLoanFrom(p.id)}>{p.avatar} {p.name}</button>)}
        {!lenders.length && <span className="faint small">{t('Niemand ist liquide genug.')}</span>}
      </div>
    </div>
  );
}

/** Kreditanfragen, die an mich gerichtet sind. */
export function LoanInbox({ code, me, byId, rescues, run }) {
  const asks = rescues.filter((r) => r.type === 'loan' && r.lenderId === me.id && r.status === 'asked');
  if (!asks.length) return null;
  return asks.map((r) => (
    <div key={r.id} className="card tinted stack pop">
      <div className="row"><Avatar player={byId[r.playerId]} /><b className="grow">{t('{name} ist pleite und will {n} 🍺 leihen', { name: byId[r.playerId]?.name, n: r.amount })}</b></div>
      <p className="small muted" style={{ margin: 0 }}>{t('Du bekommst {n} zurück, sobald sie wieder gewinnen.', { n: Math.ceil(r.amount * 1.5) })}</p>
      <div className="grid-2">
        <button className="btn ghost" onClick={() => run(() => answerLoan(code, r.id, false))}>{t('Nein')}</button>
        <button className="btn primary" onClick={() => run(() => answerLoan(code, r.id, true))}>{t('Leihen')}</button>
      </div>
    </div>
  ));
}

/** Host: offene Rettungen bestätigen / ablehnen. */
export function RescueAdmin({ code, byId, rescues, run }) {
  const open = rescues.filter((r) => r.status === 'pending' || r.status === 'accepted');
  if (!open.length) return null;
  return (
    <div className="card stack">
      <h3>🚑 {t('Pleite-Rettungen')}</h3>
      {open.map((r) => {
        const o = RESCUE_OPTIONS[r.type];
        return (
          <div key={r.id} className="stack" style={{ gap: 6, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
            <div><b>{byId[r.playerId]?.name}</b>: {o.icon} {t(o.label)} (+{r.amount})</div>
            {r.prompt && <div className="small muted">„{t(r.prompt)}“</div>}
            {r.type === 'loan' && <div className="small muted">{t('Kredit von {name} – zugesagt', { name: byId[r.lenderId]?.name })}</div>}
            <div className="grid-2">
              <button className="btn ghost sm" onClick={() => run(() => resolveRescue(code, r.id, false))}>{t('Ablehnen')}</button>
              <button className="btn primary sm" onClick={() => run(() => resolveRescue(code, r.id, true))}>{t('Bestätigen')}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
