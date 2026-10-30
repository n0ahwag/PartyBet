export const START_BALANCE = 20;

/** Basis-Mindesteinsatz der Duellanten (wird mit dem Phasen-Multiplikator verrechnet). */
export const BASE_MIN_STAKE = 2;
/** Minimaler Zuschauer-Wetteinsatz vor Multiplikator. */
export const MIN_BET = 1;

/** Quoten: Wer auf den Kontrahenten mit weniger Rückhalt setzt, bekommt das Dreifache. */
export const ODDS_FAVORITE = 2;
export const ODDS_UNDERDOG = 3;

export const BETTING_SECONDS = 25;

export const PHASES = {
  warmup: {
    id: 'warmup',
    label: 'Warm-up',
    multiplier: 1,
    accent: '#3B82F6',
    tagline: 'Locker einspielen.',
  },
  chaos: {
    id: 'chaos',
    label: 'Chaos-Runde',
    multiplier: 2,
    accent: '#F97316',
    tagline: 'Alle Einsätze verdoppelt!',
  },
  suddenDeath: {
    id: 'suddenDeath',
    label: 'Sudden Death',
    multiplier: 3,
    accent: '#DC2626',
    tagline: 'Das finale Duell. Alles oder nichts.',
  },
};

/** Phase aus Rundennummer (1-basiert) und Gesamtrunden ableiten. Letzte Runde = Sudden Death. */
export function phaseForRound(round, totalRounds) {
  if (round >= totalRounds) return 'suddenDeath';
  const warmupRounds = Math.max(1, Math.ceil((totalRounds - 1) * 0.5));
  return round <= warmupRounds ? 'warmup' : 'chaos';
}

export const EQUIPMENT = [
  { id: 'cards', label: 'Kartendeck', icon: '🃏' },
  { id: 'coins', label: 'Münzen', icon: '🪙' },
  { id: 'dice', label: 'Würfel', icon: '🎲' },
  { id: 'cups', label: 'Becher', icon: '🥤' },
];

export const POWERUPS = {
  shield: {
    id: 'shield',
    label: 'Schild',
    icon: '🛡️',
    desc: 'Verlierst du dieses Duell bzw. deine Wette, bekommst du deinen Einsatz zurück.',
    target: false,
  },
  doubleDown: {
    id: 'doubleDown',
    label: 'Double-Down',
    icon: '✌️',
    desc: 'Gewinn UND Verlust in diesem Duell zählen doppelt.',
    target: false,
  },
  sabotage: {
    id: 'sabotage',
    label: 'Sabotage-Trank',
    icon: '🧪',
    desc: 'Ein Duellant bekommt ein Handicap (digital: Zeitstrafe, real: Spezialregel).',
    target: 'duelist',
  },
  joker: {
    id: 'joker',
    label: 'Joker-Tausch',
    icon: '🔄',
    desc: 'Nur für Ausgeloste: Tausche deinen Duellplatz mit einem Zuschauer.',
    target: 'spectator',
  },
};

export const POWERUP_IDS = Object.keys(POWERUPS);

export const SABOTAGE_RULES = [
  'spielt nur mit der schwachen Hand',
  'muss dabei auf einem Bein stehen',
  'muss die Augen beim Start 3 Sekunden geschlossen halten',
  'muss während des Spiels laut singen',
];

/** Startkapital für Rettungsaktionen aus der Pleite. */
export const RESCUE_OPTIONS = {
  video: { id: 'video', label: 'Peinliches Video', icon: '🎬', reward: 5, needsHost: true,
    desc: 'Nimm ein 10-Sekunden-Video nach Ansage auf und zeig es der Runde.' },
  task: { id: 'task', label: 'Notfall-Aufgabe', icon: '🚨', reward: 5, needsHost: true,
    desc: 'Erfülle eine zufällige Aufgabe. Der Host bestätigt.' },
  loan: { id: 'loan', label: 'Kredit bei Mitspieler', icon: '🤝', reward: 0, needsHost: false,
    desc: 'Ein Mitspieler leiht dir Schlücke. Rückzahlung +50 % aus deinen nächsten Gewinnen.' },
  borrow: { id: 'borrow', label: 'Von der Bank leihen', icon: '🏦', reward: 4, needsHost: true,
    desc: '4 Schlücke von der Bank. Werden 1:1 von deinen nächsten Gewinnen abgezogen.' },
};

export const LOAN_INTEREST = 0.5;

export const EMERGENCY_TASKS = [
  'Mach 10 Kniebeugen und zähl laut mit.',
  'Imitiere einen Mitspieler, bis jemand errät, wer es ist.',
  'Erzähl in 20 Sekunden deine peinlichste Party-Story.',
  'Sing den Refrain eines Songs, den die Gruppe auswählt.',
  'Mach jemandem in der Runde ein übertriebenes Kompliment.',
  'Tanz 15 Sekunden ohne Musik.',
];

export const VIDEO_PROMPTS = [
  'Moderiere das letzte Duell wie ein Fußball-Kommentator.',
  'Halte eine dramatische Abschiedsrede an deine Schlücke.',
  'Mach Werbung für das Getränk in deiner Hand.',
  'Erkläre in Zeitlupe, warum du pleite bist.',
];

export const PLAYER_COLORS = [
  '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4', '#E11D48',
];

export const AVATARS = ['🦊', '🐸', '🐼', '🦁', '🐙', '🦄', '🐵', '🐯', '🐨', '🐧', '🦖', '🐝'];
