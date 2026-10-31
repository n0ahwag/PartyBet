import { useEffect, useMemo, useRef, useState } from 'react';
import { FIELD_TYPES, BOARD_THEMES } from '../../game/board.js';
import { layoutBoard, iso, tokenOffset, ISO_SCALE } from '../../game/board3d.js';
import { t } from '../../i18n/index.js';

/*
 * Isometrische 3D-Karte im Party-Brettspiel-Stil (reines SVG, keine 3D-Bibliothek):
 * Insel mit geschwungener Straße, runde Felder als Scheiben, Deko je Themen-Welt
 * und 3D-Spielfiguren, die Feld für Feld hüpfen.
 */

export const THEME_STYLES = {
  city: {
    sky: ['#9AD0FF', '#F7C6E8'], stars: false,
    top: '#A7D98C', topLine: '#94CC78', side: '#6FA352', sideDark: '#5A8B42', dirt: '#8B6B4A',
    road: '#5B6573', roadEdge: '#3F4753', dash: '#FDE68A',
    tiles: ['#3B82F6', '#EF4444'], decor: 'city',
  },
  jungle: {
    sky: ['#C8F7DC', '#5FB8C9'], stars: false,
    top: '#4FB25A', topLine: '#43A04D', side: '#2F7D3A', sideDark: '#24652D', dirt: '#6B4F2E',
    road: '#E2C28B', roadEdge: '#B8955C', dash: null,
    tiles: ['#F59E0B', '#0EA5E9'], decor: 'jungle',
  },
  arcade: {
    sky: ['#0F0C29', '#3B2F7A'], stars: true,
    top: '#1E1B4B', topLine: '#6D28D9', side: '#312E81', sideDark: '#251F66', dirt: '#140F38',
    road: '#0B1023', roadEdge: '#F472B6', dash: '#22D3EE',
    tiles: ['#22D3EE', '#A855F7'], decor: 'arcade',
  },
};

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/** Ungefähre Höhe der Deko je Art (Welt-Einheiten, × Größe) – für die Verdeckungs-Prüfung. */
const DECOR_HEIGHT = { city: [2.4, 1.8, 0.9], jungle: [2.2, 0.5, 0.3], arcade: [1.4, 1.5, 0.9] };

// ------------------------------------------------------------------ Bausteine

/** Iso-Quader (Gebäude, Automat, Fels …) mit Grundfläche w×d und Höhe h (Welt-Einheiten). */
function IsoBox({ X, Y, w, d, h, color, children }) {
  const p = (x, y, z) => { const q = iso(X + x, Y + y, z); return `${q.x},${q.y}`; };
  const hw = w / 2;
  const hd = d / 2;
  return (
    <g>
      <polygon points={[p(-hw, hd, 0), p(hw, hd, 0), p(hw, hd, h), p(-hw, hd, h)].join(' ')} fill={shade(color, 0.78)} />
      <polygon points={[p(hw, -hd, 0), p(hw, hd, 0), p(hw, hd, h), p(hw, -hd, h)].join(' ')} fill={shade(color, 0.62)} />
      <polygon points={[p(-hw, -hd, h), p(hw, -hd, h), p(hw, hd, h), p(-hw, hd, h)].join(' ')} fill={color} />
      {children}
    </g>
  );
}

function Decor({ item, theme }) {
  const { X, Y, kind, size } = item;
  const base = iso(X, Y);
  const s = size;
  if (theme === 'city') {
    if (kind === 0) {
      const h = 1.2 + s * 1.1;
      const color = ['#F9A8D4', '#FCD34D', '#A5B4FC', '#99F6E4'][Math.round(s * 10) % 4];
      const win = (z) => { const a = iso(X + 0.36, Y + 0.15, z); return <rect key={z} x={a.x - 2} y={a.y - 3} width="5" height="4" rx="1" fill="#FFF7D6" opacity="0.9" />; };
      return <IsoBox X={X} Y={Y} w={0.75} d={0.75} h={h} color={color}>{[0.4, 0.8, 1.2, 1.6, 2].filter((z) => z < h - 0.2).map(win)}</IsoBox>;
    }
    if (kind === 1) {
      const top = iso(X, Y, 1.2 + s * 0.4);
      const color = ['#F43F5E', '#3B82F6', '#F59E0B', '#10B981'][Math.round(s * 10) % 4];
      return (
        <g>
          <path d={`M${base.x} ${base.y}Q${base.x + 4} ${(base.y + top.y) / 2} ${top.x} ${top.y + 10}`} stroke="#6B7280" strokeWidth="1" fill="none" />
          <ellipse cx={top.x} cy={top.y} rx="8" ry="10" fill={color} />
          <ellipse cx={top.x - 3} cy={top.y - 4} rx="2.2" ry="3" fill="#fff" opacity="0.6" />
        </g>
      );
    }
    const c = iso(X, Y, 0.55 * s);
    return (
      <g>
        <rect x={base.x - 2} y={c.y} width="4" height={base.y - c.y} fill="#8B5E34" />
        <circle cx={c.x} cy={c.y} r={11 * s} fill="#4ADE80" />
        <circle cx={c.x - 3} cy={c.y - 4} r={5 * s} fill="#86EFAC" />
      </g>
    );
  }
  if (theme === 'jungle') {
    if (kind === 0) {
      const top = iso(X, Y, 1.3 * s + 0.4);
      return (
        <g>
          <path d={`M${base.x - 2.5} ${base.y}Q${base.x - 6} ${(base.y + top.y) / 2} ${top.x} ${top.y}L${top.x + 2} ${top.y}Q${base.x - 1} ${(base.y + top.y) / 2} ${base.x + 2.5} ${base.y}z`} fill="#A16207" />
          {[-150, -100, -40, 10, 60].map((a) => (
            <path key={a} d={`M${top.x} ${top.y}q${Math.cos((a * Math.PI) / 180) * 10} ${Math.sin((a * Math.PI) / 180) * 10 - 6} ${Math.cos((a * Math.PI) / 180) * 20} ${Math.sin((a * Math.PI) / 180) * 12 + 4}`}
              stroke="#15803D" strokeWidth="5" strokeLinecap="round" fill="none" />
          ))}
          <circle cx={top.x + 2} cy={top.y + 3} r="2.6" fill="#78350F" />
        </g>
      );
    }
    if (kind === 1) {
      return (
        <g>
          <ellipse cx={base.x} cy={base.y - 6 * s} rx={13 * s} ry={9 * s} fill="#166534" />
          <ellipse cx={base.x - 4} cy={base.y - 10 * s} rx={8 * s} ry={6 * s} fill="#22C55E" />
          <circle cx={base.x + 5} cy={base.y - 8 * s} r="2.2" fill="#F472B6" />
          <circle cx={base.x - 6} cy={base.y - 5 * s} r="1.8" fill="#FDE047" />
        </g>
      );
    }
    return <IsoBox X={X} Y={Y} w={0.55 * s} d={0.45 * s} h={0.3 * s} color="#A8A29E" />;
  }
  // Retro-Arcade
  if (kind === 0) {
    const scr = iso(X + 0.3, Y, 0.95);
    const color = ['#7C3AED', '#DB2777', '#0891B2'][Math.round(s * 10) % 3];
    return (
      <IsoBox X={X} Y={Y} w={0.6} d={0.5} h={1.3} color={color}>
        <rect x={scr.x - 5} y={scr.y - 6} width="10" height="8" rx="1.5" fill="#22D3EE" opacity="0.9" />
        <rect x={scr.x - 5} y={scr.y - 6} width="10" height="8" rx="1.5" fill="none" stroke="#fff" strokeWidth="0.6" />
      </IsoBox>
    );
  }
  if (kind === 1) {
    return <IsoBox X={X} Y={Y} w={0.35} d={0.35} h={0.6 + s * 0.8} color={['#F472B6', '#22D3EE', '#FACC15'][Math.round(s * 10) % 3]} />;
  }
  const c = iso(X, Y, 0.7);
  return <path d={`M${c.x} ${c.y - 8}l2.5 5.5 6 .8-4.4 4.1 1.1 6-5.2-2.9-5.2 2.9 1.1-6-4.4-4.1 6-.8z`} fill="#FACC15" opacity="0.9" />;
}

/** Spielfeld-Scheibe. */
function Tile({ X, Y, type, index, theme, highlight, fieldsTotal }) {
  const c = iso(X, Y, 0);
  const h = 6;
  const rx = 0.5 * ISO_SCALE * 1.2247;
  const ry = 0.5 * ISO_SCALE * 0.7071;
  const f = FIELD_TYPES[type];
  const color = type === 'normal' ? THEME_STYLES[theme].tiles[index % 2] : type === 'start' ? '#F8FAFC' : f.color;
  const top = c.y - h;
  return (
    <g>
      <path d={`M${c.x - rx} ${top}A${rx} ${ry} 0 0 0 ${c.x + rx} ${top}L${c.x + rx} ${c.y}A${rx} ${ry} 0 0 1 ${c.x - rx} ${c.y}Z`} fill={shade(color, 0.7)} />
      <ellipse cx={c.x} cy={top} rx={rx} ry={ry} fill={color} />
      <ellipse cx={c.x} cy={top} rx={rx * 0.78} ry={ry * 0.78} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" />
      {highlight && <ellipse cx={c.x} cy={top} rx={rx + 3} ry={ry + 2} fill="none" stroke="#fff" strokeWidth="2.5" className="tile-pulse" />}
      {f.icon && type !== 'goal' && <text x={c.x} y={top + 1} fontSize={type === 'start' ? 11 : 14} textAnchor="middle" dominantBaseline="central">{type === 'start' ? 'START' : f.icon}</text>}
      {type === 'normal' && index % (fieldsTotal > 60 ? 10 : 5) === 0 && <text x={c.x} y={top + 1} fontSize="9" fontWeight="900" fill="#fff" textAnchor="middle" dominantBaseline="central">{index}</text>}
      {type === 'goal' && (
        <g>
          <rect x={c.x - 1.5} y={top - 46} width="3" height="46" fill="#475569" />
          <path d={`M${c.x + 1.5} ${top - 46}h22l-6 7 6 7h-22z`} fill="#EF4444" />
          <text x={c.x} y={top - 2} fontSize="18" textAnchor="middle" dominantBaseline="central">🏆</text>
        </g>
      )}
    </g>
  );
}

/** 3D-Spielfigur (Kegel-Körper + Kopf-Kugel) in Spielerfarbe, mit Avatar im Gesicht. */
function Pawn({ player, x, y, step, me, label }) {
  const id = `pawn-${player.id}`;
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 0.28s cubic-bezier(.3,.7,.4,1)' }}>
      <ellipse cx="0" cy="0" rx="10" ry="5" fill="#000" opacity="0.22" />
      {me && <ellipse cx="0" cy="0" rx="14" ry="7" fill="none" stroke="#fff" strokeWidth="2" className="tile-pulse" />}
      <g key={step} className="pawn-hop">
        <defs>
          <linearGradient id={`${id}-b`} x1="0" x2="1">
            <stop offset="0" stopColor={shade(player.color, 1.25)} />
            <stop offset="0.55" stopColor={player.color} />
            <stop offset="1" stopColor={shade(player.color, 0.6)} />
          </linearGradient>
          <radialGradient id={`${id}-h`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.35" stopColor={shade(player.color, 1.3)} />
            <stop offset="1" stopColor={shade(player.color, 0.75)} />
          </radialGradient>
        </defs>
        <ellipse cx="0" cy="-2" rx="10" ry="4.5" fill={shade(player.color, 0.55)} />
        <path d="M-10 -2C-10 -9 -6 -17 -4.5 -21h9C6 -17 10 -9 10 -2c0 2.5-4.5 4-10 4s-10-1.5-10-4z" fill={`url(#${id}-b)`} />
        <circle cx="0" cy="-30" r="11" fill={`url(#${id}-h)`} />
        <text x="0" y="-29" fontSize="12" textAnchor="middle" dominantBaseline="central">{player.avatar}</text>
        {label && (
          <g>
            <rect x="-14" y="-56" width="28" height="13" rx="6.5" fill={me ? '#fff' : 'rgba(0,0,0,0.55)'} />
            <text x="0" y="-49.5" fontSize="8" fontWeight="900" fill={me ? '#111' : '#fff'} textAnchor="middle" dominantBaseline="central">{label}</text>
          </g>
        )}
      </g>
    </g>
  );
}

// ------------------------------------------------------------------ Karte

/**
 * @param positions { uid: Feld } (animiert)  @param theme city|jungle|arcade
 * @param compact Handy: Karte in Originalgröße, Kamera folgt der eigenen Figur (wischbar)
 * @param reserve Handy: Platz in px, den die übrigen Elemente brauchen
 */
export function Board3D({ fields, players, positions, theme = 'city', meId = null, compact = false, seed = 'board', reserve = 330 }) {
  const th = THEME_STYLES[theme] ?? THEME_STYLES.city;
  const layout = useMemo(() => layoutBoard(fields.length, seed), [fields.length, seed]);
  const { view, bounds } = layout;
  const width = view.maxX - view.minX;
  const height = view.maxY - view.minY;
  const [fit, setFit] = useState(!compact);
  const box = useRef(null);
  const steps = useRef({});

  // Figuren gruppiert nach Feld (für den Versatz)
  const byField = {};
  for (const p of players) (byField[positions[p.id] ?? 0] ||= []).push(p);
  const leaderPos = Math.max(0, ...players.map((p) => positions[p.id] ?? 0));

  // Kamera folgt der eigenen Figur (bzw. dem Führenden)
  const focusId = meId ?? players.find((p) => (positions[p.id] ?? 0) === leaderPos)?.id;
  const focusPos = positions[focusId] ?? 0;
  useEffect(() => {
    if (fit || !box.current) return;
    const f = layout.fields[focusPos];
    const s = iso(f.X, f.Y);
    const el = box.current;
    el.scrollTo({ left: s.x - view.minX - el.clientWidth / 2, top: s.y - view.minY - el.clientHeight / 2 - 20, behavior: 'smooth' });
  }, [focusPos, fit, layout]); // eslint-disable-line react-hooks/exhaustive-deps

  // Insel (Prisma unter der Karte)
  const P = (X, Y, Z = 0) => { const q = iso(X, Y, Z); return `${q.x},${q.y}`; };
  const depth = 1.1;
  const { minX, maxX, minY, maxY } = bounds;
  const island = (
    <g>
      <polygon points={[P(minX, maxY), P(maxX, maxY), P(maxX, maxY, -depth), P(minX, maxY, -depth)].join(' ')} fill={th.side} />
      <polygon points={[P(maxX, minY), P(maxX, maxY), P(maxX, maxY, -depth), P(maxX, minY, -depth)].join(' ')} fill={th.sideDark} />
      <polygon points={[P(minX, maxY, -0.25), P(maxX, maxY, -0.25), P(maxX, maxY, -0.35), P(minX, maxY, -0.35)].join(' ')} fill={th.dirt} opacity="0.5" />
      <polygon points={[P(minX, minY), P(maxX, minY), P(maxX, maxY), P(minX, maxY)].join(' ')} fill={th.top} />
      {/* Raster für Tiefe */}
      {Array.from({ length: Math.floor(maxX - minX) }, (_, i) => (
        <line key={`gx${i}`} x1={iso(minX + i + 1, minY).x} y1={iso(minX + i + 1, minY).y} x2={iso(minX + i + 1, maxY).x} y2={iso(minX + i + 1, maxY).y}
          stroke={th.topLine} strokeWidth={theme === 'arcade' ? 1 : 0.8} opacity={theme === 'arcade' ? 0.8 : 0.5} />
      ))}
      {Array.from({ length: Math.floor(maxY - minY) }, (_, i) => (
        <line key={`gy${i}`} x1={iso(minX, minY + i + 1).x} y1={iso(minX, minY + i + 1).y} x2={iso(maxX, minY + i + 1).x} y2={iso(maxX, minY + i + 1).y}
          stroke={th.topLine} strokeWidth={theme === 'arcade' ? 1 : 0.8} opacity={theme === 'arcade' ? 0.8 : 0.5} />
      ))}
    </g>
  );

  // Straße
  const roadD = layout.road.map((p, i) => { const q = iso(p.X, p.Y); return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join('');
  const road = (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={roadD} stroke={shade(th.roadEdge, 0.7)} strokeWidth="30" transform="translate(0 4)" />
      <path d={roadD} stroke={th.roadEdge} strokeWidth="30" />
      <path d={roadD} stroke={th.road} strokeWidth="24" />
      {th.dash && <path d={roadD} stroke={th.dash} strokeWidth="2" strokeDasharray="6 10" opacity="0.8" />}
    </g>
  );

  // Tiefensortierte Objekte: Felder, Deko, Figuren
  const items = [];
  fields.forEach((type, i) => {
    const f = layout.fields[i];
    items.push({ d: f.X + f.Y, key: `t${i}`, el: <Tile key={`t${i}`} X={f.X} Y={f.Y} type={type} index={i} theme={theme} highlight={i === leaderPos && i > 0} fieldsTotal={fields.length} /> });
  });
  // Hohe Deko nur dort, wo sie kein Feld dahinter verdeckt
  const tall = DECOR_HEIGHT[th.decor];
  const screenFields = layout.fields.map((f) => ({ ...iso(f.X, f.Y), d: f.X + f.Y }));
  layout.decor.forEach((it, i) => {
    const h = tall[it.kind] * it.size * ISO_SCALE;
    const sd = iso(it.X, it.Y);
    const hides = screenFields.some((f) => f.d < it.X + it.Y && Math.abs(f.x - sd.x) < 32 && sd.y - f.y > -4 && sd.y - f.y < h + 14);
    if (!hides) items.push({ d: it.X + it.Y, key: `d${i}`, el: <Decor key={`d${i}`} item={it} theme={th.decor} /> });
  });
  items.sort((a, b) => a.d - b.d);

  // Figuren in eigener Ebene mit fester Reihenfolge – so bleiben die DOM-Knoten stabil
  // und die CSS-Übergänge (flüssiges Ziehen) brechen nicht ab.
  const pawns = players.map((p) => {
    const pos = positions[p.id] ?? 0;
    const list = byField[pos];
    const o = tokenOffset(list.indexOf(p), list.length);
    const f = layout.fields[pos] ?? layout.fields[0];
    const s = iso(f.X + o.X, f.Y + o.Y, 0);
    const st = steps.current[p.id];
    steps.current[p.id] = st?.pos === pos ? st : { pos, n: (st?.n ?? 0) + 1 };
    return <Pawn key={p.id} player={p} x={s.x} y={s.y - 6} step={steps.current[p.id].n} me={p.id === meId} label={p.id === meId ? t('Du') : null} />;
  });


  return (
    <div className={`board3d ${compact ? 'compact' : ''}`} style={{ background: `linear-gradient(180deg, ${th.sky[0]}, ${th.sky[1]})` }}>
      {compact && (
        <button className="board3d-fit" onClick={() => setFit((v) => !v)}>{fit ? `🔍 ${t('Heranzoomen')}` : `🗺️ ${t('Ganzes Feld')}`}</button>
      )}
      {/* Handy: Karte füllt den freien Platz (reserve = Höhe der restlichen Elemente), damit nichts gescrollt werden muss */}
      <div ref={box} className="board3d-scroll" style={{ overflow: fit ? 'hidden' : 'auto', ...(compact ? { height: `clamp(180px, calc(100dvh - ${reserve}px), 460px)` } : {}) }}>
        <svg viewBox={`${view.minX} ${view.minY} ${width} ${height}`} width={fit ? '100%' : width * 1.15} height={fit ? undefined : height * 1.15}
          style={{ display: 'block', maxHeight: fit && !compact ? '70vh' : undefined, margin: '0 auto' }} role="img" aria-label={t('Spielfeld')}>
          {th.stars && Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={view.minX + ((i * 97) % 100) / 100 * width} cy={view.minY + ((i * 53) % 100) / 100 * height * 0.6} r={(i % 3) * 0.6 + 0.6} fill="#fff" opacity={0.3 + (i % 4) * 0.15} />
          ))}
          {island}
          {road}
          {items.map((it) => it.el)}
          {pawns}
        </svg>
      </div>
    </div>
  );
}

/** Auswahl der Themen-Welt (Erstellen & Lobby). */
export function ThemePicker({ value, onChange, disabled = false }) {
  return (
    <div className="grid-3">
      {['city', 'jungle', 'arcade'].map((id) => {
        const th = THEME_STYLES[id];
        return (
          <button key={id} className={`chip theme-card ${value === id ? 'on' : ''}`} disabled={disabled && value !== id} onClick={() => onChange?.(id)}
            style={{ background: `linear-gradient(160deg, ${th.sky[0]}, ${th.sky[1]})`, color: id === 'arcade' ? '#fff' : '#1f1b16' }}>
            <span style={{ fontSize: 28 }}>{BOARD_THEMES[id].icon}</span>
            <b>{t(BOARD_THEMES[id].label)}</b>
          </button>
        );
      })}
    </div>
  );
}
