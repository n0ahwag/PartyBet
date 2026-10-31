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

/**
 * Power-ups („Booster“). desc = Kurzfassung, how = So funktioniert's, when = wann einsetzbar,
 * example = Rechenbeispiel. Alle Texte werden per t() übersetzt.
 */
export const POWERUPS = {
  shield: {
    id: 'shield',
    label: 'Schild',
    icon: '🛡️',
    desc: 'Verlierst du, bekommst du deinen Einsatz zurück – du trinkst nichts.',
    how: [
      'Als Duellant: Verlierst du das Duell, bekommst du deinen Einsatz zurück.',
      'Als Zuschauer: Geht deine Wette daneben, bekommst du den Wetteinsatz zurück.',
      'Gewinnst du, passiert nichts Besonderes – das Schild ist trotzdem verbraucht.',
    ],
    when: 'Vor dem Duell (Intro oder Wettphase). Zuschauer müssen zuerst wetten.',
    example: 'Du setzt 4 Schlücke und verlierst → mit Schild trinkst du 0 statt 4.',
    target: false,
  },
  doubleDown: {
    id: 'doubleDown',
    label: 'Double-Down',
    icon: '✌️',
    desc: 'Alles zählt doppelt – Gewinn wie Verlust.',
    how: [
      'Gewinnst du, darfst du doppelt so viele Schlücke verteilen.',
      'Verlierst du, trinkst du deinen Einsatz doppelt.',
      'Gilt für dein eigenes Duell oder – als Zuschauer – für deine Wette.',
    ],
    when: 'Vor dem Duell (Intro oder Wettphase). Zuschauer müssen zuerst wetten.',
    example: 'Wette 3 Schlücke zu Quote ×2: gewonnen → 6 statt 3 verteilen, verloren → 6 statt 3 trinken.',
    target: false,
  },
  sabotage: {
    id: 'sabotage',
    label: 'Sabotage-Trank',
    icon: '🧪',
    desc: 'Gib einem Duellanten ein Handicap.',
    how: [
      'Du wählst einen der beiden Duellanten (nicht dich selbst).',
      'Digitale Spiele: Er bekommt eine Strafe, z. B. +1 bis +2 Sekunden oder einen 15 % schlechteren Wert.',
      'Real-Life-Spiele: Er muss eine Spezialregel befolgen, z. B. auf einem Bein stehen.',
      'Pro Duell zählt nur eine Sabotage – wer zuerst kommt.',
    ],
    when: 'Vor dem Duell (Intro oder Wettphase) – auch als Zuschauer ohne Wette.',
    example: 'Kompass-Axt: Dein Ziel braucht 3,2 s → mit Sabotage zählen 4,2 s.',
    target: 'duelist',
  },
  joker: {
    id: 'joker',
    label: 'Joker-Tausch',
    icon: '🔄',
    desc: 'Tausche deinen Duellplatz mit einem Zuschauer.',
    how: [
      'Nur für die beiden Ausgelosten – direkt nach der Auslosung.',
      'Du wählst einen Zuschauer mit Schlücken: Er übernimmt deinen Platz im Duell, du schaust zu.',
      'Praktisch, wenn dir das Spiel nicht liegt.',
    ],
    when: 'Nur in der Intro-Phase, bevor die Wetten öffnen.',
    example: 'Du wirst fürs Starr-Duell ausgelost, blinzelst aber ständig → Joker auf Ben, Ben muss ran.',
    target: 'spectator',
  },
};

/** Woher die Power-ups kommen (Info-Fenster). */
export const POWERUP_SOURCE = 'Jeder startet mit einem zufälligen Power-up. Wer ein Duell gewinnt, bekommt ein neues dazu. Pro Duell kannst du eins einsetzen.';


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
