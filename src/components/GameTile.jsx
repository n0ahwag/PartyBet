import { GameArt } from './GameArt.jsx';
import { EQUIPMENT } from '../game/constants.js';
import { requirementsOf } from '../game/gameLibrary.js';
import { t } from '../i18n/index.js';

/*
 * Kompakte Spielkachel (2 Spalten): Bild, Name und eine Zeile kleiner Symbole statt vieler Etiketten.
 * Die vollständigen Voraussetzungen stehen im Tooltip und auf der Spielseite.
 */

const DEVICE_ICON = { own: '📱', shared: '📲', none: '🗣️' };

/** Kurze Symbolzeile: Spielerzahl · Gerät · Sensoren · Utensilien · leise. */
export function gameMeta(game) {
  const icons = [DEVICE_ICON[game.devices] ?? ''];
  if (game.needsMotion) icons.push('📳');
  if (game.needsCompass) icons.push('🧭');
  if (game.needsCamera) icons.push('📷');
  if (game.needsMic) icons.push('🎤');
  EQUIPMENT.filter((e) => game.equipment.includes(e.id)).forEach((e) => icons.push(e.icon));
  if (game.quiet) icons.push('🤫');
  return { players: `${game.minPlayers}+`, icons: icons.filter(Boolean) };
}

/**
 * @param badge  kleiner Hinweis unten (z. B. „✓ gespielt“ oder „🔒 noch 1 Spieler“)
 */
export function GameTile({ game, onClick, disabled = false, badge = null, badgeTone = '' }) {
  const meta = gameMeta(game);
  return (
    <button type="button" className={`game-tile ${disabled ? 'locked' : ''}`} disabled={disabled} onClick={onClick}
      title={requirementsOf(game).join(' · ')} style={{ '--tile': game.accent }}>
      <GameArt game={game} size={52} />
      <b className="game-tile-name">{t(game.name)}</b>
      <span className="game-tile-meta">👥 {meta.players} {meta.icons.join(' ')}</span>
      {badge && <span className={`game-tile-badge ${badgeTone}`}>{badge}</span>}
    </button>
  );
}

/** Legende der Symbole (einmal unter der Liste). */
export function GameMetaLegend() {
  return (
    <p className="small faint center" style={{ margin: 0 }}>
      📱 {t('eigene Handys')} · 📲 {t('1 geteiltes Gerät')} · 🗣️ {t('ohne Handy')} · 📳 {t('Bewegung')} · 🧭 {t('Kompass')} · 📷 {t('Kamera')} · 🎤 {t('Mikrofon')} · 🤫 {t('leise')}
    </p>
  );
}
