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
