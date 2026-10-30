import { finalDistributors } from './economy.js';
import { t } from '../i18n/index.js';

/*
 * Wrapped-Karten. Texte werden beim Erzeugen übersetzt – Wrapped.jsx baut die
 * Karten bei Sprachwechsel neu (useMemo mit lang).
 */

/** Berechnet die "Party-Wrapped"-Karten aus Spielerstatistiken und Duell-Events. */
export function buildWrapped(players, events) {
  const list = players.map((p) => ({ ...p, stats: p.stats || {} }));
  const top = (key, { min = 1 } = {}) => {
    const sorted = [...list].sort((a, b) => (b.stats[key] ?? 0) - (a.stats[key] ?? 0));
    const best = sorted[0];
    return best && (best.stats[key] ?? 0) >= min ? best : null;
  };

  const duels = events.filter((e) => e.type === 'duel');
  const totalDrunk = list.reduce((s, p) => s + (p.stats.sipsDrunk ?? 0), 0);
  const totalGiven = list.reduce((s, p) => s + (p.stats.sipsDistributed ?? 0), 0);
  const totalBets = list.reduce((s, p) => s + (p.stats.betsWon ?? 0) + (p.stats.betsLost ?? 0), 0);
  const gameCounts = {};
  for (const d of duels) gameCounts[d.gameId] = (gameCounts[d.gameId] ?? 0) + 1;

  const cards = [
    {
      id: 'intro',
      gradient: ['#FF6B6B', '#FFD93D'],
      kicker: t('Eure Party in Zahlen'),
      title: t('{n} Duelle', { n: duels.length }),
      lines: [
        t('{n} Wetten platziert', { n: totalBets }),
        t('{n} Schlücke verloren', { n: totalDrunk }),
        t('{n} Schlücke verteilt', { n: totalGiven }),
        t('{n} verschiedene Spiele', { n: Object.keys(gameCounts).length }),
      ],
    },
  ];

  const award = (id, player, gradient, kicker, title, line) => {
    if (player) cards.push({ id, gradient, kicker, title, player, lines: [line(player)] });
  };

  award('betKing', top('betProfit'), ['#11998E', '#38EF7D'], t('Der Wett-König 💰'), top('betProfit')?.name,
    (p) => t('+{n} Schlücke Wett-Bilanz aus {m} richtigen Tipps.', { n: p.stats.betProfit, m: p.stats.betsWon }));

  award('generous', top('sipsDistributed'), ['#FC5C7D', '#6A82FB'], t('Der Spendable 🍻'), top('sipsDistributed')?.name,
    (p) => t('Hat {n} Schlücke an andere verteilt.', { n: p.stats.sipsDistributed }));

  award('unlucky', top('sipsDrunk'), ['#4568DC', '#B06AB3'], t('Der Pechvogel 🐦'), top('sipsDrunk')?.name,
    (p) => t('{n} Schlücke selbst getrunken. Prost!', { n: p.stats.sipsDrunk }));

  award('saboteur', top('sabotages'), ['#8E2DE2', '#4A00E0'], t('Der Saboteur 🧪'), top('sabotages')?.name,
    (p) => t('{n}× Sabotage-Trank verteilt. Niemand traut dir mehr.', { n: p.stats.sabotages }));

  award('duelist', top('duelsWon'), ['#EB3349', '#F45C43'], t('Duell-Monster ⚔️'), top('duelsWon')?.name,
    (p) => t('{n} Duelle gewonnen, {m} verloren.', { n: p.stats.duelsWon, m: p.stats.duelsLost }));

  award('highRoller', top('biggestBet'), ['#F857A6', '#FF5858'], t('High Roller 🎰'), top('biggestBet')?.name,
    (p) => t('Größte Einzelwette: {n} Schlücke.', { n: p.stats.biggestBet }));

  award('broke', top('bankruptcies'), ['#434343', '#000000'], t('Pleitegeier 🦅'), top('bankruptcies')?.name,
    (p) => t('{n}× pleite, {m}× gerettet.', { n: p.stats.bankruptcies, m: p.stats.rescues ?? 0 }));

  award('shield', top('shieldSaves'), ['#00B4DB', '#0083B0'], t('Unverwundbar 🛡️'), top('shieldSaves')?.name,
    (p) => t('{n}× vom Schild gerettet.', { n: p.stats.shieldSaves }));

  award('slowpoke', top('eventLosses'), ['#F2994A', '#F2C94C'], t('Die Schnecke 🐌'), top('eventLosses')?.name,
    (p) => t('{n}× bei Live-Events der Langsamste.', { n: p.stats.eventLosses }));

  award('banker', top('loansGiven'), ['#56AB2F', '#A8E063'], t('Die Bank 🏦'), top('loansGiven')?.name,
    (p) => t('Hat {n}× Kredit gegeben. Mit Zinsen.', { n: p.stats.loansGiven }));

  const finalists = finalDistributors(list);
  if (finalists.length) {
    const n = finalists[0].balance;
    cards.push({
      id: 'finale',
      gradient: ['#B8860B', '#FFD700'],
      kicker: t('👑 Das große Finale'),
      title: finalists.map((p) => p.name).join(' & '),
      player: finalists[0],
      lines: [
        finalists.length > 1
          ? t('Gleichstand mit {n} Schlücken – jeder von euch darf seine {n} Schlücke verteilen!', { n })
          : t('Hat am meisten Schlücke übrig und darf alle {n} jetzt verteilen! 🍻', { n }),
      ],
    });
  }

  cards.push({
    id: 'outro',
    gradient: ['#141E30', '#243B55'],
    kicker: t('Endstand'),
    title: t('Danke fürs Spielen!'),
    ranking: [...list].sort((a, b) => b.balance - a.balance),
  });
  return cards;
}

/** Wrapped für den Spielfeld-Modus (alkoholfrei). */
export function buildBoardWrapped(players, events, room) {
  const list = players.map((p) => ({ ...p, stats: p.stats || {} }));
  const top = (key) => {
    const best = [...list].sort((a, b) => (b.stats[key] ?? 0) - (a.stats[key] ?? 0))[0];
    return best && (best.stats[key] ?? 0) >= 1 ? best : null;
  };
  const sum = (key) => list.reduce((s, p) => s + (p.stats[key] ?? 0), 0);
  const rounds = events.filter((e) => e.type === 'boardRound').length;
  const goal = room.board.fields.length - 1;

  const cards = [{
    id: 'intro',
    gradient: ['#36D1DC', '#5B86E5'],
    kicker: t('Euer Spielfeld in Zahlen'),
    title: t('{n} Challenges', { n: rounds }),
    lines: [
      t('{n} Felder gezogen', { n: sum('fieldsMoved') }),
      t('{n}× Rakete gezündet 🚀', { n: sum('rockets') }),
      t('{n}× durchs Portal 🌀', { n: sum('portals') }),
    ],
  }];

  const winner = list.find((p) => p.id === room.winnerId);
  if (winner) {
    cards.push({
      id: 'king', gradient: ['#B8860B', '#FFD700'], kicker: t('Der Brettspiel-König 👑'),
      title: winner.name, player: winner, lines: [t('Hat als Erster das Ziel erreicht! 🏆')],
    });
  }

  const award = (id, key, gradient, kicker, line) => {
    const p = top(key);
    if (p) cards.push({ id, gradient, kicker, title: p.name, player: p, lines: [line(p.stats[key], p)] });
  };
  award('turbo', 'biggestMove', ['#F7971E', '#FF512F'], t('Der Turbo-Läufer ⚡'), (n) => t('Größter Einzelzug: {n} Felder auf einmal.', { n }));
  award('champ', 'firstPlaces', ['#11998E', '#38EF7D'], t('Challenge-Champion 🥇'), (n) => t('{n}× Platz 1 in einer Challenge.', { n }));
  award('unlucky', 'fieldsLost', ['#4568DC', '#B06AB3'], t('Der Pechvogel 🐦'), (n) => t('{n} Felder durch Stolpersteine, Portale & Events verloren.', { n }));
  award('rocket', 'rockets', ['#00B09B', '#96C93D'], t('Raketen-Pilot 🚀'), (n) => t('{n}× auf einer Rakete gelandet.', { n }));
  award('portal', 'portals', ['#8E2DE2', '#4A00E0'], t('Der Portal-Dieb 🌀'), (n) => t('{n}× dem Führenden den Platz geklaut.', { n }));
  award('stumble', 'stumbles', ['#757F9A', '#D7DDE8'], t('Stolper-Profi 🪨'), (n) => t('{n}× über einen Stolperstein gefallen.', { n }));
  award('slowpoke', 'eventLosses', ['#F2994A', '#F2C94C'], t('Die Schnecke 🐌'), (n) => t('{n}× bei Live-Events der Langsamste.', { n }));

  cards.push({
    id: 'outro',
    gradient: ['#141E30', '#243B55'],
    kicker: t('Endstand'),
    title: t('Danke fürs Spielen!'),
    ranking: [...list]
      .sort((a, b) => (b.id === room.winnerId) - (a.id === room.winnerId) || (b.position ?? 0) - (a.position ?? 0))
      .map((p) => ({ ...p, value: t('Feld {n}/{m}', { n: p.position ?? 0, m: goal }) })),
  });
  return cards;
}

/** Wrapped für den Gruppen-Modus (Punkte). */
export function buildGroupWrapped(players, events) {
  const list = players.map((p) => ({ ...p, stats: p.stats || {}, points: p.points ?? 0 }));
  const top = (key) => {
    const best = [...list].sort((a, b) => (b.stats[key] ?? 0) - (a.stats[key] ?? 0))[0];
    return best && (best.stats[key] ?? 0) >= 1 ? best : null;
  };
  const rounds = events.filter((e) => e.type === 'groupRound');
  const syncWins = rounds.filter((e) => e.gameId === 'syncTest' && e.success).length;
  const stories = rounds.filter((e) => e.story).map((e) => e.story);

  const cards = [{
    id: 'intro',
    gradient: ['#A18CD1', '#FBC2EB'],
    kicker: t('Eure Gruppe in Zahlen'),
    title: t('{n} Runden', { n: rounds.length }),
    lines: [
      t('{n} Punkte gesammelt', { n: list.reduce((s, p) => s + p.points, 0) }),
      syncWins ? t('{n}× perfekt synchron 🤝', { n: syncWins }) : null,
    ].filter(Boolean),
  }];

  const maxPts = Math.max(...list.map((p) => p.points));
  const champs = list.filter((p) => p.points === maxPts && maxPts > 0);
  if (champs.length) {
    cards.push({
      id: 'champion', gradient: ['#B8860B', '#FFD700'], kicker: t('Gruppen-Champion 👑'),
      title: champs.map((p) => p.name).join(' & '), player: champs[0], lines: [t('{n} Punkte', { n: maxPts })],
    });
  }

  const award = (id, key, gradient, kicker, line) => {
    const p = top(key);
    if (p) cards.push({ id, gradient, kicker, title: p.name, player: p, lines: [line(p.stats[key])] });
  };
  award('magnet', 'votesReceived', ['#F43F5E', '#FB923C'], t('Der Gruppen-Magnet 🧲'), (n) => t('{n} Stimmen bei „Wer am ehesten …“ kassiert.', { n }));
  award('psychic', 'confessCorrect', ['#8B5CF6', '#6366F1'], t('Der Hellseher 🔮'), (n) => t('{n} Geheimnisse richtig zugeordnet.', { n }));
  award('poker', 'confessFooled', ['#334155', '#64748B'], t('Das Pokerface 🎭'), (n) => t('{n}× mit dem eigenen Geheimnis alle getäuscht.', { n }));
  award('hive', 'hivemindHits', ['#EAB308', '#F59E0B'], t('Das Herdentier 🐑'), (n) => t('{n}× genau wie die Mehrheit gedacht.', { n }));
  award('champ', 'firstPlaces', ['#11998E', '#38EF7D'], t('Runden-Sieger 🥇'), (n) => t('{n}× Platz 1 geholt.', { n }));
  award('slowpoke', 'eventLosses', ['#F2994A', '#F2C94C'], t('Die Schnecke 🐌'), (n) => t('{n}× bei Live-Events der Langsamste.', { n }));

  if (stories.length) {
    cards.push({ id: 'story', gradient: ['#0EA5E9', '#22D3EE'], kicker: t('Eure Ketten-Story 📜'), title: t('Vorgelesen:'), lines: [stories.at(-1)] });
  }

  cards.push({
    id: 'outro',
    gradient: ['#141E30', '#243B55'],
    kicker: t('Endstand'),
    title: t('Danke fürs Spielen!'),
    ranking: [...list].sort((a, b) => b.points - a.points).map((p) => ({ ...p, value: t('{n} Punkte', { n: p.points }) })),
  });
  return cards;
}
