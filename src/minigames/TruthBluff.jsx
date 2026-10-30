import { useState } from 'react';
import { Waiting } from './shared.jsx';
import { sfx } from '../lib/sound.js';
import { t } from '../i18n/index.js';

/** Spiel 13 – Wahrheit oder Bluff: A behauptet, B (und alle anderen) raten. */
function Play({ duel, me, byId, submit }) {
  const [claim, setClaim] = useState('');
  const [truth, setTruth] = useState(null);
  const a = byId[duel.playerA];
  const claimRes = duel.results?.[duel.playerA];

  if (me.id === duel.playerA) {
    if (claimRes) return <Waiting text={byId[duel.playerB] ? t('{name} rät gerade…', { name: byId[duel.playerB].name }) : t('Die anderen raten gerade…')} />;
    return (
      <div className="stack">
        <div className="card tinted"><b>{t('Du behauptest!')}</b> {t('Schreib etwas Verrücktes über dich – wahr oder gelogen.')}</div>
        <textarea className="input" rows={3} maxLength={140} placeholder={t('z. B. „Ich bin mal mit einem Kamel geritten.“')} value={claim} onChange={(e) => setClaim(e.target.value)} />
        <div className="grid-2">
          <button className={`chip ${truth === true ? 'on' : ''}`} style={{ justifyContent: 'center', padding: 14 }} onClick={() => setTruth(true)}>✅ {t('Stimmt')}</button>
          <button className={`chip ${truth === false ? 'on' : ''}`} style={{ justifyContent: 'center', padding: 14 }} onClick={() => setTruth(false)}>🤥 {t('Gelogen')}</button>
        </div>
        <button className="btn primary lg" disabled={!claim.trim() || truth === null}
          onClick={() => { submit(null, { claim: claim.trim(), truth }); sfx.betJingle(); }}>{t('Geheim abschicken')}</button>
      </div>
    );
  }
  if (!claimRes) return <Waiting text={t('{name} denkt sich gerade eine Behauptung aus…', { name: a?.name })} />;
  return (
    <div className="stack">
      <div className="card center stack">
        <div className="kicker">{a?.avatar} {t('{name} behauptet', { name: a?.name })}</div>
        <h2 style={{ fontSize: 26 }}>„{claimRes.claim}“</h2>
      </div>
      <div className="grid-2">
        <button className="btn primary lg" onClick={() => submit(null, { guess: true })}>✅ {t('Wahr')}</button>
        <button className="btn lg" onClick={() => submit(null, { guess: false })}>🤥 {t('Lüge')}</button>
      </div>
    </div>
  );
}

function Stage({ duel, byId, big }) {
  const a = byId[duel.playerA];
  const b = byId[duel.playerB];
  const claimRes = duel.results?.[duel.playerA];
  const guess = duel.results?.[duel.playerB];
  if (!claimRes) return <div className="card center muted" style={{ fontWeight: 700 }}>✍️ {t('{name} denkt sich eine Behauptung aus…', { name: a?.name })}</div>;
  return (
    <div className="stack">
      <div className="card tinted center stack">
        <div className="kicker">{a?.avatar} {t('{name} behauptet', { name: a?.name })}</div>
        <h2 style={{ fontSize: big ? 46 : 26, lineHeight: 1.15 }}>„{claimRes.claim}“</h2>
        {!guess && <p className="muted" style={{ margin: 0, fontWeight: 700 }}>{b ? t('Alle raten laut mit: Wahr oder Lüge? {name} entscheidet.', { name: b.name }) : t('Alle tippen auf ihrem Handy: Wahr oder Lüge?')}</p>}
      </div>
      {guess && (
        <div className="card center stack pop">
          <div>{t('{name} tippt auf', { name: b?.name })} <b>{guess.guess ? t('WAHR') : t('LÜGE')}</b></div>
          <h2 style={{ fontSize: big ? 40 : 24 }}>{t('Auflösung')}: {claimRes.truth ? `✅ ${t('Stimmt!')}` : `🤥 ${t('Gelogen!')}`}</h2>
        </div>
      )}
    </div>
  );
}

/** Gruppen-Großbild: nur die Behauptung, Auflösung erst in der Platzierung. */
function GroupStage({ duel, byId, big }) {
  const a = byId[duel.playerA];
  const claimRes = duel.results?.[duel.playerA];
  return (
    <div className="card tinted center stack">
      <div className="kicker">{a?.avatar} {t('{name} erzählt', { name: a?.name })}</div>
      <h2 style={{ fontSize: big ? 46 : 24, lineHeight: 1.15 }}>{claimRes ? `„${claimRes.claim}“` : `✍️ ${t('denkt sich etwas aus…')}`}</h2>
    </div>
  );
}

export const TruthBluff = { Play, Stage, Review: Stage, GroupStage };
