import { finalDistributors } from './economy.js';

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
      kicker: 'Eure Party in Zahlen',
      title: `${duels.length} Duelle`,
      lines: [
        `${totalBets} Wetten platziert`,
        `${totalDrunk} Schlücke verloren`,
        `${totalGiven} Schlücke verteilt`,
        `${Object.keys(gameCounts).length} verschiedene Spiele`,
      ].filter(Boolean),
    },
  ];

  const award = (id, player, gradient, kicker, title, line) => {
    if (player) cards.push({ id, gradient, kicker, title, player, lines: [line(player)] });
  };

  award('betKing', top('betProfit'), ['#11998E', '#38EF7D'], 'Der Wett-König 💰', top('betProfit')?.name,
    (p) => `+${p.stats.betProfit} Schlücke Wett-Bilanz aus ${p.stats.betsWon} richtigen Tipps.`);

  award('generous', top('sipsDistributed'), ['#FC5C7D', '#6A82FB'], 'Der Spendable 🍻', top('sipsDistributed')?.name,
    (p) => `Hat ${p.stats.sipsDistributed} Schlücke an andere verteilt.`);

  award('unlucky', top('sipsDrunk'), ['#4568DC', '#B06AB3'], 'Der Pechvogel 🐦', top('sipsDrunk')?.name,
    (p) => `${p.stats.sipsDrunk} Schlücke selbst getrunken. Prost!`);

  award('saboteur', top('sabotages'), ['#8E2DE2', '#4A00E0'], 'Der Saboteur 🧪', top('sabotages')?.name,
    (p) => `${p.stats.sabotages}× Sabotage-Trank verteilt. Niemand traut dir mehr.`);

  award('duelist', top('duelsWon'), ['#EB3349', '#F45C43'], 'Duell-Monster ⚔️', top('duelsWon')?.name,
    (p) => `${p.stats.duelsWon} Duelle gewonnen, ${p.stats.duelsLost} verloren.`);

  award('highRoller', top('biggestBet'), ['#F857A6', '#FF5858'], 'High Roller 🎰', top('biggestBet')?.name,
    (p) => `Größte Einzelwette: ${p.stats.biggestBet} Schlücke.`);

  award('broke', top('bankruptcies'), ['#434343', '#000000'], 'Pleitegeier 🦅', top('bankruptcies')?.name,
    (p) => `${p.stats.bankruptcies}× pleite, ${p.stats.rescues ?? 0}× gerettet.`);

  award('shield', top('shieldSaves'), ['#00B4DB', '#0083B0'], 'Unverwundbar 🛡️', top('shieldSaves')?.name,
    (p) => `${p.stats.shieldSaves}× vom Schild gerettet.`);

  award('slowpoke', top('eventLosses'), ['#F2994A', '#F2C94C'], 'Die Schnecke 🐌', top('eventLosses')?.name,
    (p) => `${p.stats.eventLosses}× bei Live-Events der Langsamste.`);

  award('banker', top('loansGiven'), ['#56AB2F', '#A8E063'], 'Die Bank 🏦', top('loansGiven')?.name,
    (p) => `Hat ${p.stats.loansGiven}× Kredit gegeben. Mit Zinsen.`);

  const finalists = finalDistributors(list);
  if (finalists.length) {
    const n = finalists[0].balance;
    cards.push({
      id: 'finale',
      gradient: ['#B8860B', '#FFD700'],
      kicker: '👑 Das große Finale',
      title: finalists.map((p) => p.name).join(' & '),
      player: finalists[0],
      lines: [
        finalists.length > 1
          ? `Gleichstand mit ${n} Schlücken – jeder von euch darf seine ${n} Schlücke verteilen!`
          : `Hat am meisten Schlücke übrig und darf alle ${n} jetzt verteilen! 🍻`,
      ],
    });
  }

  cards.push({
    id: 'outro',
    gradient: ['#141E30', '#243B55'],
    kicker: 'Endstand',
    title: 'Danke fürs Spielen!',
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
    kicker: 'Euer Spielfeld in Zahlen',
    title: `${rounds} Challenges`,
    lines: [
      `${sum('fieldsMoved')} Felder gezogen`,
      `${sum('rockets')}× Rakete gezündet 🚀`,
      `${sum('portals')}× durchs Portal 🌀`,
    ],
  }];

  const winner = list.find((p) => p.id === room.winnerId);
  if (winner) {
    cards.push({
      id: 'king', gradient: ['#B8860B', '#FFD700'], kicker: 'Der Brettspiel-König 👑',
      title: winner.name, player: winner, lines: ['Hat als Erster das Ziel erreicht! 🏆'],
    });
  }

  const award = (id, key, gradient, kicker, line) => {
    const p = top(key);
    if (p) cards.push({ id, gradient, kicker, title: p.name, player: p, lines: [line(p.stats[key], p)] });
  };
  award('turbo', 'biggestMove', ['#F7971E', '#FF512F'], 'Der Turbo-Läufer ⚡', (n) => `Größter Einzelzug: ${n} Felder auf einmal.`);
  award('champ', 'firstPlaces', ['#11998E', '#38EF7D'], 'Challenge-Champion 🥇', (n) => `${n}× Platz 1 in einer Challenge.`);
  award('unlucky', 'fieldsLost', ['#4568DC', '#B06AB3'], 'Der Pechvogel 🐦', (n) => `${n} Felder durch Stolpersteine, Portale & Events verloren.`);
  award('rocket', 'rockets', ['#00B09B', '#96C93D'], 'Raketen-Pilot 🚀', (n) => `${n}× auf einer Rakete gelandet.`);
  award('portal', 'portals', ['#8E2DE2', '#4A00E0'], 'Der Portal-Dieb 🌀', (n) => `${n}× dem Führenden den Platz geklaut.`);
  award('stumble', 'stumbles', ['#757F9A', '#D7DDE8'], 'Stolper-Profi 🪨', (n) => `${n}× über einen Stolperstein gefallen.`);
  award('slowpoke', 'eventLosses', ['#F2994A', '#F2C94C'], 'Die Schnecke 🐌', (n) => `${n}× bei Live-Events der Langsamste.`);

  cards.push({
    id: 'outro',
    gradient: ['#141E30', '#243B55'],
    kicker: 'Endstand',
    title: 'Danke fürs Spielen!',
    ranking: [...list]
      .sort((a, b) => (b.id === room.winnerId) - (a.id === room.winnerId) || (b.position ?? 0) - (a.position ?? 0))
      .map((p) => ({ ...p, value: `Feld ${p.position ?? 0}/${goal}` })),
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
    kicker: 'Eure Gruppe in Zahlen',
    title: `${rounds.length} Runden`,
    lines: [
      `${list.reduce((s, p) => s + p.points, 0)} Punkte gesammelt`,
      syncWins ? `${syncWins}× perfekt synchron 🤝` : null,
    ].filter(Boolean),
  }];

  const maxPts = Math.max(...list.map((p) => p.points));
  const champs = list.filter((p) => p.points === maxPts && maxPts > 0);
  if (champs.length) {
    cards.push({
      id: 'champion', gradient: ['#B8860B', '#FFD700'], kicker: 'Gruppen-Champion 👑',
      title: champs.map((p) => p.name).join(' & '), player: champs[0], lines: [`${maxPts} Punkte`],
    });
  }

  const award = (id, key, gradient, kicker, line) => {
    const p = top(key);
    if (p) cards.push({ id, gradient, kicker, title: p.name, player: p, lines: [line(p.stats[key])] });
  };
  award('magnet', 'votesReceived', ['#F43F5E', '#FB923C'], 'Der Gruppen-Magnet 🧲', (n) => `${n} Stimmen bei „Wer am ehesten …“ kassiert.`);
  award('psychic', 'confessCorrect', ['#8B5CF6', '#6366F1'], 'Der Hellseher 🔮', (n) => `${n} Geheimnisse richtig zugeordnet.`);
  award('poker', 'confessFooled', ['#334155', '#64748B'], 'Das Pokerface 🎭', (n) => `${n}× mit dem eigenen Geheimnis alle getäuscht.`);
  award('hive', 'hivemindHits', ['#EAB308', '#F59E0B'], 'Das Herdentier 🐑', (n) => `${n}× genau wie die Mehrheit gedacht.`);
  award('champ', 'firstPlaces', ['#11998E', '#38EF7D'], 'Runden-Sieger 🥇', (n) => `${n}× Platz 1 geholt.`);
  award('slowpoke', 'eventLosses', ['#F2994A', '#F2C94C'], 'Die Schnecke 🐌', (n) => `${n}× bei Live-Events der Langsamste.`);

  if (stories.length) {
    cards.push({ id: 'story', gradient: ['#0EA5E9', '#22D3EE'], kicker: 'Eure Ketten-Story 📜', title: 'Vorgelesen:', lines: [stories.at(-1)] });
  }

  cards.push({
    id: 'outro',
    gradient: ['#141E30', '#243B55'],
    kicker: 'Endstand',
    title: 'Danke fürs Spielen!',
    ranking: [...list].sort((a, b) => b.points - a.points).map((p) => ({ ...p, value: `${p.points} Punkte` })),
  });
  return cards;
}
