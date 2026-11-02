import { GAMES } from '../game/gameLibrary.js';
import { FORMAT_RESULT } from '../minigames/format.js';
import { t } from '../i18n/index.js';

const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_H = { 1: 1, 2: 0.72, 3: 0.5 };

/**
 * Auswertung eines Spiels: Siegertreppchen (Platz 1–3) + restliche Plätze.
 * Auf den Handys steht zusätzlich groß, welchen Platz man selbst gemacht hat.
 *
 * @param ranks  { uid: Platz } (Platz > Teilnehmerzahl = kein Ergebnis)
 * @param extra  (uid) => Zusatz unter dem Namen (z. B. Punkte oder Würfel)
 */
export function Placements({ round, ranks = round.ranks, byId, meId, big = false, extra, showMine = true, showRest = true }) {
  if (!ranks) return null;
  const ids = round.participants;
  const n = ids.length;
  const game = GAMES[round.gameId];
  const fmt = game?.judge === 'auto' && !game.groupOnly ? FORMAT_RESULT[round.gameId] : null;
  const resultOf = (id) => (fmt && round.results?.[id] ? fmt(round.results[id], round, id) : null);
  const sorted = [...ids].sort((a, b) => (ranks[a] ?? 99) - (ranks[b] ?? 99) || ids.indexOf(a) - ids.indexOf(b));
  const at = (r) => sorted.filter((id) => ranks[id] === r);
  const spots = [2, 1, 3].filter((r) => r <= n && at(r).length);
  const rest = sorted.filter((id) => !(ranks[id] <= 3));
  const mine = meId && ids.includes(meId) ? ranks[meId] : null;
  const unit = big ? 150 : 96;

  return (
    <div className="stack placements" style={{ gap: 12 }}>
      {showMine && mine != null && (
        <div className={`card center my-place pop ${mine === 1 ? 'win' : ''}`}>
          <div className="kicker">{t('Dein Ergebnis')}</div>
          <div className="my-place-rank">{mine > n ? '–' : `${MEDAL[mine - 1] ?? ''} ${t('Platz {n}', { n: mine })}`}</div>
          <div className="small muted" style={{ fontWeight: 700 }}>
            {mine > n ? t('Kein gültiges Ergebnis') : t('von {n} Spielern', { n })}{resultOf(meId) ? ` · ${resultOf(meId)}` : ''}
          </div>
        </div>
      )}
      <div className="podium" style={{ '--unit': `${unit}px` }}>
        {spots.map((r, k) => (
          <div key={r} className={`podium-col p${r}`} style={{ animationDelay: `${[0.25, 0.5, 0][k] ?? 0}s` }}>
            <div className="podium-people">
              {at(r).map((id) => (
                <div key={id} className={`podium-person ${id === meId ? 'me' : ''}`}>
                  <span className="avatar" style={{ width: big ? 58 : 44, height: big ? 58 : 44, fontSize: big ? 32 : 24, background: `color-mix(in srgb, ${byId[id]?.color ?? '#999'} 28%, #fff)` }}>{byId[id]?.avatar}</span>
                  <b className="ellipsis" style={{ fontSize: big ? 20 : 14 }}>{byId[id]?.name}</b>
                  {resultOf(id) && <span className="small muted ellipsis">{resultOf(id)}</span>}
                  {extra && <span className="small">{extra(id)}</span>}
                </div>
              ))}
            </div>
            <div className="podium-block" style={{ height: `calc(var(--unit) * ${PODIUM_H[r]})` }}>
              <span>{MEDAL[r - 1]}</span>
              <b>{r}</b>
            </div>
          </div>
        ))}
      </div>
      {showRest && rest.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          {rest.map((id) => {
            const r = ranks[id];
            return (
              <div key={id} className={`player-row ${id === meId ? 'me' : ''}`} style={{ padding: '8px 12px' }}>
                <span style={{ fontWeight: 900, width: 30, textAlign: 'center' }}>{r > n ? '–' : `${r}.`}</span>
                <div className="avatar">{byId[id]?.avatar}</div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <b>{byId[id]?.name}</b>
                  {resultOf(id) && <div className="small muted">{resultOf(id)}</div>}
                  {!resultOf(id) && r > n && <div className="small muted">{t('kein Ergebnis')}</div>}
                </div>
                {extra && <span className="small" style={{ textAlign: 'right' }}>{extra(id)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
