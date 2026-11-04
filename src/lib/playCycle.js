/*
 * Partyübergreifender Spiele-Durchlauf (auf dem Host-Gerät): Jedes Spiel kommt erst wieder,
 * wenn alle anderen einmal dran waren – auch über mehrere Partys hinweg.
 * Nur Komfort: Ohne localStorage (privates Fenster) gilt einfach der Durchlauf pro Party.
 */
const key = (scope) => `fo_cycle:${scope}`;

export function cycleIds(scope) {
  try {
    const v = JSON.parse(localStorage.getItem(key(scope)) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Gespieltes Spiel merken; reset = neuer Durchlauf (alles war schon dran). */
export function rememberPlayed(scope, gameId, { reset = false } = {}) {
  if (!gameId) return;
  try {
    const list = reset ? [] : cycleIds(scope);
    if (!list.includes(gameId)) list.push(gameId);
    localStorage.setItem(key(scope), JSON.stringify(list.slice(-300)));
  } catch {
    /* kein Speicher verfügbar */
  }
}
