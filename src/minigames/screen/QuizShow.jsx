import { useState } from 'react';
import { GAMES } from '../../game/gameLibrary.js';
import { QUIZ, quizCell, QUIZ_CATEGORIES, canBuzz } from '../../game/screen/quizShow.js';
import { L } from '../../game/screen/common.js';
import { submitResultField, submitStamp } from '../../game/groupEngine.js';
import { TvFrame, PadFrame, ScoreStrip, Timer, useNow, usePhaseSound, Booting } from './ui.jsx';
import { sfx, vibrate } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

const LETTERS = ['A', 'B', 'C', 'D'];

function Board({ round, sim, big }) {
  const cats = round.game.cats.map((i) => QUIZ_CATEGORIES[i]);
  return (
    <div className="quiz-board" style={{ fontSize: big ? 22 : 14 }}>
      {cats.map((c, ci) => (
        <div key={ci} className="quiz-col">
          <div className="quiz-cat">{c.icon} {L(c.name)}</div>
          {[0, 1, 2].map((row) => {
            const cell = ci * 3 + row;
            const used = sim.used.includes(cell) && sim.cell !== cell;
            return <div key={row} className={`quiz-cell ${used ? 'used' : ''} ${sim.cell === cell ? 'on' : ''}`}>{used ? '' : (row + 1) * 100}</div>;
          })}
        </div>
      ))}
    </div>
  );
}

function QuestionCard({ round, sim, byId, big }) {
  const { cat, value, question } = quizCell(round.game, sim.cell);
  const reveal = sim.phase === 'reveal';
  return (
    <div className="stack" style={{ gap: big ? 18 : 10 }}>
      <div className="quiz-q">
        <div className="tv-sub">{cat.icon} {L(cat.name)} · {value}</div>
        <div style={{ fontSize: big ? 38 : 20, fontWeight: 900, lineHeight: 1.2 }}>{L(question.q)}</div>
      </div>
      <div className="quiz-options">
        {question.o.map((o, i) => {
          const right = reveal && i === question.a;
          const wrong = sim.last?.by && sim.last.ok === false && sim.last.i === i;
          return (
            <div key={i} className={`quiz-opt ${right ? 'right' : ''} ${wrong ? 'wrong' : ''}`} style={{ fontSize: big ? 26 : 15 }}>
              <span className="quiz-letter">{LETTERS[i]}</span>{L(o)}
            </div>
          );
        })}
      </div>
      {sim.phase === 'answer' && <div className="tv-banner hot">🔔 {t('{name} antwortet!', { name: byId[sim.buzzer]?.name })}</div>}
      {sim.phase === 'question' && sim.last?.ok === false && <div className="tv-banner bad">❌ {t('{name} lag falsch – wer weiß es?', { name: byId[sim.last.by]?.name })}</div>}
      {reveal && sim.last?.ok && <div className="tv-banner good">✅ {t('{name} holt {n} Punkte!', { name: byId[sim.last.by]?.name, n: value })}</div>}
      {reveal && !sim.last?.ok && <div className="tv-banner">{t('Niemand wusste es.')}</div>}
    </div>
  );
}

function Stage({ round, byId, big = true }) {
  const now = useNow(200);
  const sim = round.sim;
  const game = GAMES.quizShow;
  usePhaseSound(sim ? `${sim.phase}:${sim.k}:${sim.locked?.length ?? 0}` : null, () => {
    if (!sim) return;
    if (sim.phase === 'answer') sfx.buzzer();
    else if (sim.phase === 'question') sfx.whoosh();
    else if (sim.phase === 'reveal') (sim.last?.ok ? sfx.tusch : sfx.fail)();
  });
  if (!sim) return <Booting big={big} />;
  const total = { board: sim.chooser ? QUIZ.pickMs : QUIZ.autoPickMs, question: QUIZ.buzzMs + QUIZ.readMs, answer: QUIZ.answerMs, reveal: QUIZ.revealMs }[sim.phase];
  return (
    <TvFrame game={game} subtitle={t('Frage {a} von {b}', { a: Math.max(1, sim.used.length), b: 9 })}
      right={sim.phase !== 'done' && <Timer until={sim.until} total={total} now={now} size={big ? 74 : 54} />}>
      {sim.phase === 'board' ? (
        <>
          <Board round={round} sim={sim} big={big} />
          <div className="tv-banner">{sim.chooser ? `🎯 ${t('{name} wählt das nächste Feld', { name: byId[sim.chooser]?.name })}` : `🎲 ${t('Das erste Feld wird ausgelost …')}`}</div>
        </>
      ) : sim.cell != null ? <QuestionCard round={round} sim={sim} byId={byId} big={big} /> : null}
      <ScoreStrip ids={round.participants} byId={byId} value={(id) => sim.scores?.[id] ?? 0} highlight={sim.buzzer} big={big} />
    </TvFrame>
  );
}

function Play({ code, round, me, byId, run }) {
  const now = useNow(200);
  const sim = round.sim;
  const [pressed, setPressed] = useState(null); // k, für das ich gebuzzert habe
  if (!sim) return <Booting />;
  const my = sim.scores?.[me.id] ?? 0;
  const top = <div className="row between"><b>🎙️ {t('Quiz-Show')}</b><span className="balance">{my} P</span></div>;
  let body;
  if (sim.phase === 'board') {
    if (sim.chooser === me.id) {
      body = (
        <>
          <div className="kicker center">🎯 {t('Du wählst das nächste Feld!')}</div>
          <div className="quiz-board pad-board">
            {round.game.cats.map((ci, col) => (
              <div key={col} className="quiz-col">
                <div className="quiz-cat">{QUIZ_CATEGORIES[ci].icon}</div>
                {[0, 1, 2].map((row) => {
                  const cell = col * 3 + row;
                  const used = sim.used.includes(cell);
                  return (
                    <button key={row} className="quiz-cell" disabled={used}
                      onClick={() => { vibrate(20); run(() => submitResultField(code, round.id, me.id, 'pick', { n: sim.pickN, cell })); }}>
                      {used ? '' : (row + 1) * 100}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      );
    } else body = <div className="pad-wait">📺 {sim.chooser ? t('{name} wählt ein Feld …', { name: byId[sim.chooser]?.name }) : t('Gleich kommt die erste Frage …')}</div>;
  } else if (sim.phase === 'question') {
    const locked = sim.locked?.includes(me.id);
    const open = canBuzz(sim, me.id, now);
    const mine = pressed === sim.k && !locked;
    body = (
      <div className="stack center" style={{ gap: 14 }}>
        <div className="small muted" style={{ fontWeight: 800 }}>📺 {t('Lies die Frage auf dem Bildschirm')}</div>
        <button className={`buzzer ${open && !mine ? 'live' : ''}`} disabled={!open || mine}
          onClick={() => { setPressed(sim.k); vibrate(60); sfx.buzzer(); run(() => submitStamp(code, round.id, me.id, 'buzz', { k: sim.k })); }}>
          {locked ? '🔒' : mine ? '…' : open ? t('BUZZ!') : '⏳'}
        </button>
        <b>{locked ? t('Du hast falsch geantwortet – diesmal gesperrt.') : mine ? t('Gebuzzert! Wer war schneller?') : open ? t('Wer zuerst drückt, antwortet!') : t('Gleich geht der Buzzer auf …')}</b>
      </div>
    );
  } else if (sim.phase === 'answer') {
    if (sim.buzzer === me.id) {
      const { question } = quizCell(round.game, sim.cell);
      body = (
        <div className="stack" style={{ gap: 10 }}>
          <div className="kicker center">🔔 {t('Du bist dran – welche Antwort?')}</div>
          <div className="small center" style={{ fontWeight: 800 }}>{L(question.q)}</div>
          {question.o.map((o, i) => (
            <button key={i} className="btn soft lg block" style={{ justifyContent: 'flex-start' }}
              onClick={() => { vibrate(25); run(() => submitResultField(code, round.id, me.id, 'ans', { k: sim.k, i })); }}>
              <b style={{ marginRight: 10 }}>{LETTERS[i]}</b> {L(o)}
            </button>
          ))}
        </div>
      );
    } else body = <div className="pad-wait">🔔 {t('{name} antwortet …', { name: byId[sim.buzzer]?.name })}</div>;
  } else if (sim.phase === 'reveal') {
    const me1 = sim.last?.by === me.id;
    body = <div className="pad-wait">{me1 ? (sim.last.ok ? `✅ ${t('Richtig!')}` : `❌ ${t('Leider falsch')}`) : `📺 ${t('Auflösung auf dem Bildschirm')}`}</div>;
  } else body = <div className="pad-wait">🏁 {t('Die Show ist vorbei!')}</div>;
  return <PadFrame top={top}>{body}</PadFrame>;
}

export const QuizShow = { Play, Stage };
