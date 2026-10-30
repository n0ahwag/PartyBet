import { BASE_MIN_STAKE, MIN_BET, ODDS_FAVORITE, ODDS_UNDERDOG, PHASES } from './constants.js';

/**
 * Reine Wirtschafts-Logik – keine Firebase-Abhängigkeit.
 * Ablauf: lockDuel() bucht Einsätze ab (Escrow), settleDuel() zahlt aus.
 */

export function minStakeFor(phase) {
  return BASE_MIN_STAKE * PHASES[phase].multiplier;
}

export function effectiveBet(amount, phase) {
  return Math.max(0, Math.floor(amount)) * PHASES[phase].multiplier;
}

/**
 * @param duel     { playerA, playerB, phase, bets: { [uid]: { on, amount } } }
 * @param balances { [uid]: number } aktuelle Kontostände
 * @returns { stakes, bets, odds, debits }
 */
export function lockDuel(duel, balances) {
  const { playerA, playerB, phase } = duel;
  const debits = {};
  const stakes = {};

  for (const pid of [playerA, playerB]) {
    stakes[pid] = Math.min(balances[pid] ?? 0, minStakeFor(phase));
    debits[pid] = stakes[pid];
  }

  const bets = {};
  for (const [uid, bet] of Object.entries(duel.bets || {})) {
    if (uid === playerA || uid === playerB) continue;
    if (bet.on !== playerA && bet.on !== playerB) continue;
    if (bet.amount < MIN_BET) continue;
    const amount = Math.min(effectiveBet(bet.amount, phase), balances[uid] ?? 0);
    if (amount <= 0) continue;
    bets[uid] = { on: bet.on, amount };
    debits[uid] = amount;
  }

  const pool = { [playerA]: 0, [playerB]: 0 };
  for (const b of Object.values(bets)) pool[b.on] += b.amount;
  const odds = { [playerA]: ODDS_FAVORITE, [playerB]: ODDS_FAVORITE };
  if (pool[playerA] < pool[playerB]) odds[playerA] = ODDS_UNDERDOG;
  else if (pool[playerB] < pool[playerA]) odds[playerB] = ODDS_UNDERDOG;

  return { stakes, bets, odds, debits };
}

/**
 * Auszahlung nach Duell-Ende.
 * @param duel     gesperrtes Duell (stakes, bets, odds, activePowerups)
 * @param winnerId Gewinner-UID oder null (= Unentschieden: alles zurück)
 * @param balances Kontostände NACH Abbuchung der Einsätze
 * @param debts    { [uid]: [{ to, amount }] } offene Schulden
 * @returns { credits, net, repayments, outcome }
 *   credits:   Betrag, der dem Konto gutgeschrieben (negativ: zusätzlich abgezogen) wird
 *   net:       Gesamtergebnis des Duells pro Spieler (für "Trink X Schlücke")
 *   repayments [{ from, to, amount }]  automatisch getilgte Schulden
 *   outcome:   { [uid]: 'won'|'lost'|'shielded'|'void' }
 */
export function settleDuel(duel, winnerId, balances, debts = {}) {
  const powerups = duel.activePowerups || {};
  const has = (uid, type) => powerups[uid]?.type === type;
  const credits = {};
  const net = {};
  const outcome = {};

  const settleStake = (uid, stake, won, odds) => {
    if (winnerId === null) {
      credits[uid] = stake;
      net[uid] = 0;
      outcome[uid] = 'void';
      return;
    }
    const dd = has(uid, 'doubleDown') ? 2 : 1;
    if (won) {
      const profit = stake * (odds - 1) * dd;
      credits[uid] = stake + profit;
      net[uid] = profit;
      outcome[uid] = 'won';
    } else if (has(uid, 'shield')) {
      credits[uid] = stake;
      net[uid] = 0;
      outcome[uid] = 'shielded';
    } else {
      const extra = dd > 1 ? Math.min(stake, balances[uid] ?? 0) : 0;
      credits[uid] = extra ? -extra : 0;
      net[uid] = -(stake + extra);
      outcome[uid] = 'lost';
    }
  };

  for (const [uid, stake] of Object.entries(duel.stakes || {})) {
    settleStake(uid, stake, uid === winnerId, 2);
  }
  for (const [uid, bet] of Object.entries(duel.bets || {})) {
    settleStake(uid, bet.amount, bet.on === winnerId, duel.odds?.[bet.on] ?? ODDS_FAVORITE);
  }

  // Schulden automatisch aus Gewinnen tilgen
  const repayments = [];
  for (const [uid, list] of Object.entries(debts)) {
    let available = Math.max(0, net[uid] ?? 0);
    for (const d of list || []) {
      if (available <= 0) break;
      const pay = Math.min(available, d.amount);
      if (pay <= 0) continue;
      repayments.push({ from: uid, to: d.to, amount: pay });
      credits[uid] = (credits[uid] ?? 0) - pay;
      available -= pay;
      if (d.to !== 'bank') credits[d.to] = (credits[d.to] ?? 0) + pay;
    }
  }

  return { credits, net, repayments, outcome };
}

/** Reduziert Schuldenliste um getätigte Rückzahlungen. */
export function applyRepayments(debtList = [], repayments, uid) {
  let list = debtList.map((d) => ({ ...d }));
  for (const r of repayments.filter((x) => x.from === uid)) {
    let left = r.amount;
    for (const d of list) {
      if (d.to !== r.to || left <= 0) continue;
      const pay = Math.min(left, d.amount);
      d.amount -= pay;
      left -= pay;
    }
  }
  return list.filter((d) => d.amount > 0);
}
