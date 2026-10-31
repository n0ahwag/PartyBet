/*
 * Spiel-Illustrationen: eigene, flache SVG-Bilder statt Emojis.
 * Einheitlicher Look: 64×64, abgerundete Kachel in der Spielfarbe, runde Formen,
 * wenige Farben (Spielfarbe, Tinte, Weiß, Gelb, Rosa), kleine Glitzer-Akzente.
 */

const INK = '#2D3047';
const YEL = '#FFC94D';
const YEL_D = '#E9A23B';
const PINK = '#FF7A93';
const MINT = '#2EC4B6';
const SKY = '#4CC9F0';
const W = '#FFFFFF';

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (h, t, to = [255, 255, 255]) => `#${rgb(h).map((c, i) => Math.round(c + (to[i] - c) * t).toString(16).padStart(2, '0')).join('')}`;

const Sparkle = ({ x, y, s = 4, fill = W }) => (
  <path d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`} fill={fill} />
);
const Shadow = ({ c, rx = 16, y = 55 }) => <ellipse cx="32" cy={y} rx={rx} ry="3" fill={c} opacity="0.22" />;
const hexPath = (cx, cy, r) => `M${[0, 1, 2, 3, 4, 5].map((i) => {
  const a = (Math.PI / 3) * i;
  return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
}).join('L')}Z`;
const Txt = ({ x, y, size = 12, fill = INK, children, rotate }) => (
  <text x={x} y={y} fontSize={size} fontWeight="900" fill={fill} textAnchor="middle" dominantBaseline="central"
    fontFamily="Outfit, 'Nunito', system-ui, sans-serif" transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}>{children}</text>
);

/** Jede Funktion bekommt Spielfarbe a, dunkle Variante d und mittlere Variante m. */
const ART = {
  colorSprint: ({ a, d }) => (
    <>
      <Shadow c={d} rx={18} />
      <path d="M32 12c12.7 0 22 7.6 22 17 0 5.6-4.2 8-8.5 8H41c-3 0-4.2 2.8-2.4 5 2.3 2.9.4 7-4.6 7C20.5 49 10 41 10 30.5S19.6 12 32 12z" fill={W} />
      <circle cx="21" cy="26" r="4.6" fill={a} />
      <circle cx="31" cy="19.5" r="4.6" fill={YEL} />
      <circle cx="42.5" cy="24.5" r="4.6" fill={PINK} />
      <circle cx="20.5" cy="38" r="4.6" fill={SKY} />
      <Sparkle x={52} y={44} s={4} fill={YEL} />
    </>
  ),
  speedTap: ({ a, d }) => (
    <>
      <Shadow c={d} rx={14} y={56} />
      <rect x="18" y="8" width="28" height="47" rx="7" fill={INK} />
      <rect x="21.5" y="12" width="21" height="19" rx="3" fill={a} />
      <rect x="21.5" y="32" width="21" height="19" rx="3" fill={PINK} />
      <path d="M35 17 25.5 33h6.5l-3.5 12L39 29h-6.5l2.5-12z" fill={YEL} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <Sparkle x={51} y={14} s={4} />
    </>
  ),
  balance: ({ a, d }) => (
    <g transform="translate(32 36) scale(1.22) translate(-32 -36)">
      <path d="M32 43l8.5 12h-17z" fill={d} />
      <g transform="rotate(-9 32 37)">
        <rect x="9" y="30" width="46" height="14" rx="5" fill={INK} />
        <rect x="12.5" y="33" width="39" height="8" rx="4" fill={W} />
        <circle cx="36.5" cy="37" r="3.2" fill={a} />
        <path d="M30 33.5v7M35 33.5v7" stroke={mix(a, 0.6)} strokeWidth="1.2" />
      </g>
      <Sparkle x={14} y={16} s={4} fill={YEL} />
      <Sparkle x={50} y={18} s={3} />
    </g>
  ),
  memoryCode: ({ a, d }) => (
    <>
      <Shadow c={d} rx={18} y={56} />
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => {
        const on = [[0, 0], [1, 1], [2, 0], [1, 2]].some(([x, y]) => x === c && y === r);
        const yel = c === 2 && r === 2;
        return <rect key={`${r}${c}`} x={13 + c * 13.5} y={11 + r * 13.5} width="11" height="11" rx="3.5" fill={yel ? YEL : on ? a : W} />;
      }))}
      <circle cx="18.5" cy="16.5" r="1.8" fill={W} />
      <circle cx="32" cy="30" r="1.8" fill={W} />
    </>
  ),
  estimate: ({ a, d }) => (
    <>
      <Shadow c={d} rx={16} y={56} />
      <rect x="15" y="20" width="34" height="34" rx="10" fill={W} />
      <rect x="18" y="13" width="28" height="8" rx="3.5" fill={d} />
      {[[22, 44, a], [29, 47, YEL], [36, 45, PINK], [43, 46, a], [25, 39, SKY], [33, 40, a], [40, 39, YEL], [21, 49, PINK], [41, 50, SKY], [30, 34, PINK]].map(([x, y, c], i) => <circle key={i} cx={x} cy={y} r="3.2" fill={c} />)}
      <circle cx="44" cy="22" r="8" fill={a} stroke={W} strokeWidth="2" />
      <Txt x={44} y={22.5} size={11} fill={W}>?</Txt>
      <rect x="19" y="23" width="3" height="12" rx="1.5" fill={mix(a, 0.75)} />
    </>
  ),
  highCard: ({ a, d }) => (
    <>
      <Shadow c={d} rx={17} />
      <rect x="12" y="14" width="22" height="32" rx="4" fill={a} transform="rotate(-13 23 30)" stroke={W} strokeWidth="2" />
      <g transform="rotate(10 38 30)">
        <rect x="26" y="12" width="24" height="35" rx="4.5" fill={W} />
        <Txt x={31} y={18.5} size={8} fill={a}>A</Txt>
        <path d="M38 37c-6-4-8.2-7.2-8.2-10.2a4.1 4.1 0 0 1 8.2-1.2 4.1 4.1 0 0 1 8.2 1.2c0 3-2.2 6.2-8.2 10.2z" fill={a} />
      </g>
      <Sparkle x={52} y={13} s={4} fill={YEL} />
    </>
  ),
  coinOracle: ({ d }) => (
    <>
      <Shadow c={d} rx={15} y={56} />
      <circle cx="32" cy="35" r="18" fill={YEL_D} />
      <circle cx="32" cy="32" r="18" fill={YEL} />
      <circle cx="32" cy="32" r="13" fill="none" stroke={YEL_D} strokeWidth="2.5" />
      <path d="M32 23.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill={YEL_D} />
      <path d="M22 22a14 14 0 0 1 8-6" stroke={W} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
      <Sparkle x={53} y={14} s={4.5} />
      <Sparkle x={11} y={46} s={3.5} />
    </>
  ),
  diceDuel: ({ a, d }) => {
    const pips = (cx, cy, pts, c) => pts.map(([x, y], i) => <circle key={i} cx={cx + x} cy={cy + y} r="2.1" fill={c} />);
    return (
      <>
        <Shadow c={d} rx={19} y={56} />
        <g transform="rotate(-13 23 38)">
          <rect x="12" y="29" width="22" height="22" rx="5.5" fill="#D9D7E8" />
          <rect x="12" y="27" width="22" height="22" rx="5.5" fill={W} />
          {pips(23, 38, [[-5.5, -5.5], [0, 0], [5.5, 5.5]], INK)}
        </g>
        <g transform="rotate(15 42 26)">
          <rect x="31" y="17" width="22" height="22" rx="5.5" fill={d} />
          <rect x="31" y="15" width="22" height="22" rx="5.5" fill={a} />
          {pips(42, 26, [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]], W)}
        </g>
        <Sparkle x={12} y={14} s={4} fill={YEL} />
      </>
    );
  },
  cupFlip: ({ a, d }) => (
    <>
      <Shadow c={d} rx={13} y={56} />
      <g transform="rotate(-18 32 34)">
        <path d="M19 17h26l-3.2 31.5a3.5 3.5 0 0 1-3.5 3.2H25.7a3.5 3.5 0 0 1-3.5-3.2z" fill={a} />
        <rect x="17" y="13.5" width="30" height="6" rx="3" fill={d} />
        <path d="M21.5 27h21M22.5 37h19" stroke={W} strokeWidth="2.2" opacity="0.55" />
      </g>
      <path d="M11 22q-3.5 6 0 12M15.5 25q-2 3 0 6M53 34q3.5 6 0 12M48.5 37q2 3 0 6" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <Sparkle x={51} y={14} s={4} fill={YEL} />
    </>
  ),
  shake: ({ a, d }) => (
    <>
      <Shadow c={d} rx={12} y={56} />
      <g transform="rotate(-8 32 32)">
        <rect x="21" y="10" width="22" height="42" rx="6" fill={INK} />
        <rect x="24" y="14.5" width="16" height="33" rx="3" fill={a} />
        <circle cx="32" cy="31" r="5" fill={W} opacity="0.85" />
      </g>
      <path d="M14 20l-4 4 4 4-4 4 4 4M50 24l4 4-4 4 4 4-4 4" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Sparkle x={52} y={13} s={4} fill={YEL} />
    </>
  ),
  compass: ({ a, d }) => (
    <>
      <Shadow c={d} rx={15} y={56} />
      <circle cx="32" cy="33" r="20" fill={d} />
      <circle cx="32" cy="31" r="20" fill={W} />
      <circle cx="32" cy="31" r="15.5" fill="none" stroke={mix(a, 0.6)} strokeWidth="2" strokeDasharray="2 4.1" />
      <g transform="rotate(35 32 31)">
        <path d="M32 14l5.5 17h-11z" fill={PINK} />
        <path d="M32 48l5.5-17h-11z" fill={INK} />
      </g>
      <circle cx="32" cy="31" r="3" fill={YEL} stroke={INK} strokeWidth="1.5" />
      <Txt x={32} y={8.5} size={7} fill={d}>N</Txt>
    </>
  ),
  emojiQuiz: ({ a, d }) => (
    <>
      <Shadow c={d} rx={16} />
      <path d="M18 12h28a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H30l-8 7v-7h-4a8 8 0 0 1-8-8V20a8 8 0 0 1 8-8z" fill={W} />
      <circle cx="26" cy="28" r="10" fill={YEL} />
      <circle cx="22.5" cy="25.5" r="1.7" fill={INK} />
      <circle cx="29.5" cy="25.5" r="1.7" fill={INK} />
      <path d="M21.5 30.5q4.5 5 9 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Txt x={45} y={28} size={17} fill={a}>?</Txt>
    </>
  ),
  stareDown: ({ a }) => (
    <>
      {[21, 43].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy="34" rx="10" ry="12" fill={W} />
          <circle cx={x + (i ? -2 : 2)} cy="35" r="5.5" fill={a} />
          <circle cx={x + (i ? -2 : 2)} cy="35" r="2.6" fill={INK} />
          <circle cx={x + (i ? -3.5 : 0.5)} cy="33" r="1.3" fill={W} />
        </g>
      ))}
      <path d="M12 18l16 4M52 18l-16 4" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M30.5 52h3" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </>
  ),
  rhythm: ({ a, d }) => (
    <>
      <Shadow c={d} rx={17} y={56} />
      <path d="M15 30v16a17 5.5 0 0 0 34 0V30z" fill={a} />
      <path d="M17 33l7.5 12 7.5-12 7.5 12 7.5-12" stroke={W} strokeWidth="1.8" fill="none" opacity="0.7" strokeLinejoin="round" />
      <ellipse cx="32" cy="30" rx="17" ry="5.5" fill={W} />
      <ellipse cx="32" cy="30" rx="17" ry="5.5" fill="none" stroke={d} strokeWidth="2" />
      <path d="M17 10l13 17M47 10L34 27" stroke="#E8B46A" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="17" cy="10" r="3.2" fill="#E8B46A" />
      <circle cx="47" cy="10" r="3.2" fill="#E8B46A" />
      <Sparkle x={8} y={24} s={3.5} fill={YEL} />
      <Sparkle x={56} y={22} s={3} />
    </>
  ),
  bluffCard: ({ a, d }) => (
    <>
      <Shadow c={d} rx={14} y={56} />
      <g transform="rotate(-8 32 32)">
        <rect x="17" y="10" width="30" height="42" rx="5" fill={a} />
        <rect x="20.5" y="13.5" width="23" height="35" rx="3" fill="none" stroke={W} strokeWidth="1.5" opacity="0.55" />
        <path d="M32 20l7 11-7 11-7-11z" fill={W} opacity="0.3" />
      </g>
      <path d="M15 28h34" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 28h12.5v3.5a5.5 5.5 0 0 1-11 0zM35.5 28H48v3.5a5.5 5.5 0 0 1-11 0z" fill={INK} />
      <path d="M19.5 29.5l3 3M39 29.5l3 3" stroke={W} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <Sparkle x={53} y={12} s={4} fill={YEL} />
    </>
  ),
  coinSprint: ({ a, d }) => (
    <>
      <Shadow c={d} rx={16} y={56} />
      <circle cx="37" cy="31" r="19" fill={W} />
      <circle cx="37" cy="31" r="14" fill={a} />
      <circle cx="37" cy="31" r="9" fill={W} />
      <circle cx="37" cy="31" r="4.2" fill={a} />
      <circle cx="16" cy="46" r="7.5" fill={YEL_D} />
      <circle cx="16" cy="45" r="7.5" fill={YEL} />
      <circle cx="16" cy="45" r="4.5" fill="none" stroke={YEL_D} strokeWidth="1.6" />
      <path d="M4 40h5M3 46h4M5 52h5" stroke={INK} strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
    </>
  ),
  truthBluff: ({ a, d }) => (
    <>
      <Shadow c={d} rx={18} y={56} />
      <path d="M15 9h20a6.5 6.5 0 0 1 6.5 6.5v9A6.5 6.5 0 0 1 35 31H22l-6 5.5V31h-1a6.5 6.5 0 0 1-6.5-6.5v-9A6.5 6.5 0 0 1 15 9z" fill={W} />
      <path d="M18 20.5l4.5 4.5 8.5-9" stroke="#06D6A0" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M29 27h20a6.5 6.5 0 0 1 6.5 6.5v9A6.5 6.5 0 0 1 49 49h-1v5.5L42 49H29a6.5 6.5 0 0 1-6.5-6.5v-9A6.5 6.5 0 0 1 29 27z" fill={PINK} />
      <path d="M34 33l10 10M44 33L34 43" stroke={W} strokeWidth="3.4" strokeLinecap="round" />
    </>
  ),
  stopwatch: ({ a, d }) => (
    <>
      <Shadow c={d} rx={15} y={57} />
      <rect x="28" y="7" width="8" height="7" rx="2.5" fill={d} />
      <rect x="45" y="14" width="6" height="5" rx="2" fill={d} transform="rotate(40 48 16.5)" />
      <circle cx="32" cy="35" r="19" fill={a} />
      <circle cx="32" cy="35" r="15" fill={W} />
      <path d="M32 35V20a15 15 0 0 1 15 15z" fill={mix(a, 0.7)} />
      <path d="M32 35l7-9" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="32" cy="35" r="2.6" fill={INK} />
      <Sparkle x={10} y={18} s={4} fill={YEL} />
    </>
  ),
  mathBlitz: ({ a, d }) => (
    <>
      <Shadow c={d} rx={15} y={57} />
      <rect x="15" y="8" width="34" height="47" rx="7" fill={INK} />
      <rect x="19.5" y="12.5" width="25" height="11" rx="3" fill={mix(a, 0.7)} />
      <path d="M33 14.5l-4.5 4h3l-1.5 3 4.5-4h-3z" fill={a} />
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={19.5 + c * 9} y={28 + r * 8.6} width="7" height="6.4" rx="2"
          fill={c === 2 ? (r === 2 ? YEL : a) : W} opacity={c === 2 ? 1 : 0.92} />
      )))}
      <Sparkle x={55} y={12} s={4} fill={YEL} />
    </>
  ),
  wordChain: ({ a, d }) => (
    <>
      <Shadow c={d} rx={18} y={55} />
      <rect x="6" y="25" width="28" height="15" rx="7.5" fill="none" stroke={a} strokeWidth="5.5" transform="rotate(-22 20 32.5)" />
      <rect x="30" y="25" width="28" height="15" rx="7.5" fill="none" stroke={d} strokeWidth="5.5" transform="rotate(-22 44 32.5)" />
      <rect x="6" y="25" width="28" height="15" rx="7.5" fill="none" stroke={a} strokeWidth="5.5" strokeDasharray="0 46 30 100" transform="rotate(-22 20 32.5)" />
      <circle cx="13" cy="13" r="6.5" fill={W} />
      <Txt x={13} y={13.5} size={9} fill={a}>A</Txt>
      <circle cx="51" cy="51" r="6.5" fill={W} />
      <Txt x={51} y={51.5} size={9} fill={d}>Z</Txt>
    </>
  ),
  f1Start: ({ a, d }) => (
    <>
      <path d="M17 34v10M47 34v10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <rect x="6" y="14" width="52" height="21" rx="7" fill={INK} />
      {[13.5, 23.25, 33, 42.75, 52.5].map((x) => (
        <g key={x}>
          <circle cx={x - 1} cy="24.5" r="4.2" fill={a} />
          <circle cx={x - 2.4} cy="23" r="1.2" fill={W} opacity="0.8" />
        </g>
      ))}
      {[0, 1].flatMap((r) => [0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
        <rect key={`${r}${c}`} x={12 + c * 5} y={45 + r * 5} width="5" height="5" fill={(r + c) % 2 ? INK : W} />
      )))}
      <rect x="12" y="45" width="40" height="10" rx="1" fill="none" stroke={d} strokeWidth="1" />
    </>
  ),
  secretNumber: ({ a, d }) => (
    <>
      <Shadow c={d} rx={16} y={57} />
      <path d="M22 30v-7a10 10 0 0 1 20 0v7" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <rect x="14" y="27" width="36" height="27" rx="7" fill={a} />
      <rect x="18.5" y="34" width="27" height="10" rx="3" fill={W} />
      {[24, 32, 40].map((x, i) => <Txt key={x} x={x} y={39.3} size={8} fill={i === 1 ? a : INK}>{['4', '?', '7'][i]}</Txt>)}
      <Sparkle x={52} y={13} s={4} fill={YEL} />
    </>
  ),
  association: ({ a, d }) => (
    <>
      <path d="M32 26L12 14M32 26l20-12M32 26l-21 18M32 26l21 18" stroke={mix(a, 0.45)} strokeWidth="2.2" strokeLinecap="round" />
      {[[12, 14, a], [52, 14, PINK], [11, 44, SKY], [53, 44, a]].map(([x, y, c]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5.5" fill={c} stroke={W} strokeWidth="2" />)}
      <circle cx="32" cy="26" r="12" fill={YEL} />
      <path d="M27.5 37h9v6.5a2.5 2.5 0 0 1-2.5 2.5h-4a2.5 2.5 0 0 1-2.5-2.5z" fill={INK} />
      <path d="M27.5 40.5h9" stroke={W} strokeWidth="1.3" opacity="0.6" />
      <path d="M28 24a5 5 0 0 1 5-5" stroke={W} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <Shadow c={d} rx={8} y={53} />
    </>
  ),
  categorySprint: ({ a, d }) => (
    <>
      <Shadow c={d} rx={19} y={56} />
      <g transform="rotate(-10 22 28)">
        <rect x="10" y="17" width="23" height="23" rx="6" fill={mix(a, 0.75)} />
        <rect x="10" y="15" width="23" height="23" rx="6" fill={W} />
        <Txt x={21.5} y={27} size={15} fill={a}>A</Txt>
      </g>
      <g transform="rotate(9 42 37)">
        <rect x="30.5" y="27" width="23" height="23" rx="6" fill={d} />
        <rect x="30.5" y="25" width="23" height="23" rx="6" fill={a} />
        <Txt x={42} y={37} size={15} fill={W}>Z</Txt>
      </g>
      <Sparkle x={50} y={13} s={4.5} fill={W} />
      <Sparkle x={13} y={50} s={3} fill={YEL} />
    </>
  ),
  numberMemory: ({ a, d }) => (
    <>
      <Shadow c={d} rx={16} y={56} />
      <rect x="17" y="13" width="32" height="34" rx="4" fill={mix(a, 0.5)} transform="rotate(9 33 30)" />
      <g transform="rotate(-5 31 31)">
        <rect x="14" y="14" width="34" height="36" rx="4" fill={YEL} />
        <path d="M14 18a4 4 0 0 1 4-4h26a4 4 0 0 1 4 4v3H14z" fill={YEL_D} opacity="0.55" />
        <Txt x={31} y={35} size={13} fill={INK}>739</Txt>
      </g>
      <circle cx="32" cy="15" r="3.6" fill={a} stroke={W} strokeWidth="1.5" />
    </>
  ),
  rps: ({ a, d }) => (
    <>
      <Shadow c={d} rx={20} y={56} />
      <g transform="rotate(-6 32 22)">
        <rect x="21" y="7" width="22" height="27" rx="3" fill={W} />
        <path d="M25 14h14M25 19h14M25 24h9" stroke={mix(a, 0.55)} strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <path d="M9 47c-1-7 4-12 10-12 5 0 11 3 11 9 0 6-5 9-11 9-5 0-9-2-10-6z" fill="#A9B4C2" />
      <path d="M13 41c2-2 5-3 8-2" stroke={W} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M43 44l12-15M45 33l9 17" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="47.5" r="4.6" fill="none" stroke={a} strokeWidth="3.2" />
      <circle cx="42" cy="30.5" r="4.6" fill="none" stroke={a} strokeWidth="3.2" />
    </>
  ),
  whoMost: ({ a, d }) => (
    <>
      <Shadow c={d} rx={19} y={57} />
      <g transform="rotate(-8 32 22)">
        <rect x="23" y="7" width="18" height="24" rx="2.5" fill={W} />
        <path d="M27 19l3.5 3.5 6.5-7" stroke={a} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <rect x="12" y="29" width="40" height="25" rx="5" fill={a} />
      <rect x="12" y="27" width="40" height="7" rx="3" fill={d} />
      <rect x="21" y="29.5" width="22" height="2.4" rx="1.2" fill={INK} />
      <rect x="22" y="40" width="20" height="7" rx="3.5" fill={W} opacity="0.85" />
      <Sparkle x={52} y={14} s={4} fill={YEL} />
    </>
  ),
  syncTest: ({ a, d }) => (
    <>
      <circle cx="32" cy="32" r="22" fill="none" stroke={a} strokeWidth="2" opacity="0.25" />
      <circle cx="32" cy="32" r="16" fill="none" stroke={a} strokeWidth="2.4" opacity="0.5" />
      <path d="M19 27a14 14 0 0 1 22-9" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M43 13.5l.5 7-7 .3z" fill={INK} />
      <path d="M45 37a14 14 0 0 1-22 9" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M21 50.5l-.5-7 7-.3z" fill={INK} />
      <circle cx="28.5" cy="32" r="7" fill={a} />
      <circle cx="35.5" cy="32" r="7" fill={PINK} opacity="0.9" />
      <circle cx="32" cy="32" r="2.4" fill={W} />
      <Shadow c={d} rx={10} y={58} />
    </>
  ),
  hivemind: ({ d }) => (
    <>
      <Shadow c={d} rx={19} y={57} />
      {[[17, 42], [31, 50], [31, 34], [45, 42]].map(([x, y], i) => (
        <path key={i} d={hexPath(x, y, 8.6)} fill={i === 2 ? YEL : YEL_D} stroke={W} strokeWidth="1.8" />
      ))}
      <g transform="rotate(-15 43 18)">
        <ellipse cx="38" cy="11.5" rx="5" ry="6.5" fill={W} opacity="0.9" transform="rotate(-25 38 11.5)" />
        <ellipse cx="46" cy="11" rx="5" ry="6.5" fill={W} opacity="0.9" transform="rotate(20 46 11)" />
        <ellipse cx="43" cy="20" rx="9" ry="6.5" fill={YEL} stroke={INK} strokeWidth="1.6" />
        <path d="M41 14v12M45.5 14.2v11.6" stroke={INK} strokeWidth="2.4" />
        <circle cx="51" cy="19" r="1.3" fill={INK} />
      </g>
      <path d="M12 22q4-6 10-3" stroke={INK} strokeWidth="1.6" strokeDasharray="2 3" fill="none" strokeLinecap="round" />
    </>
  ),
  confession: ({ a, d }) => (
    <>
      <Shadow c={d} rx={19} y={56} />
      <rect x="11" y="19" width="42" height="31" rx="5" fill={W} />
      <path d="M12 22l20 15 20-15" fill="none" stroke={mix(a, 0.45)} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="32" cy="37" r="7.5" fill={a} />
      <path d="M32 41.5c-3.6-2.4-4.9-4.2-4.9-6a2.4 2.4 0 0 1 4.9-.7 2.4 2.4 0 0 1 4.9.7c0 1.8-1.3 3.6-4.9 6z" fill={W} />
      <Txt x={50} y={12} size={10} fill={d}>psst</Txt>
      <Sparkle x={10} y={11} s={3.5} fill={YEL} />
    </>
  ),
  chainStory: ({ a, d }) => (
    <>
      <Shadow c={d} rx={21} y={56} />
      <path d="M8 22q12-5 24 0v28q-12-5-24 0z" fill={W} />
      <path d="M56 22q-12-5-24 0v28q12-5 24 0z" fill={mix(a, 0.85)} />
      <path d="M12 29q8-3 16 0M12 35q8-3 16 0M12 41q8-3 12 0M36 29q8-3 16 0M36 35q8-3 16 0" stroke={mix(a, 0.5)} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M32 22v28" stroke={d} strokeWidth="1.6" />
      <g transform="rotate(35 46 20)">
        <path d="M46 4c5 4 6 14 0 24-6-10-5-20 0-24z" fill={a} />
        <path d="M46 8v26" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <Sparkle x={13} y={13} s={4} fill={YEL} />
    </>
  ),
  spiritLevel: ({ a, d }) => (
    <>
      <Shadow c={d} rx={17} y={56} />
      <circle cx="32" cy="33" r="21" fill={d} />
      <circle cx="32" cy="31" r="21" fill={INK} />
      <circle cx="32" cy="31" r="16.5" fill="#C9F2E0" />
      <path d="M32 15v32M16 31h32" stroke={INK} strokeWidth="1.2" opacity="0.25" />
      <circle cx="32" cy="31" r="6.5" fill="none" stroke={a} strokeWidth="2" />
      <circle cx="36.5" cy="27" r="5" fill={W} />
      <circle cx="35" cy="25.5" r="1.6" fill={W} opacity="0.9" stroke="#A7E8CB" strokeWidth="0.8" />
      <Sparkle x={53} y={12} s={4} fill={YEL} />
    </>
  ),
  safeCracker: ({ a, d }) => (
    <>
      <Shadow c={d} rx={19} y={57} />
      <rect x="10" y="10" width="44" height="43" rx="7" fill={a} />
      <rect x="13.5" y="13.5" width="37" height="36" rx="4.5" fill={d} opacity="0.35" />
      <circle cx="30" cy="31.5" r="12" fill="#E5E7EB" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d="M30 21v3" stroke={INK} strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${i * 45} 30 31.5)`} />
      ))}
      <circle cx="30" cy="31.5" r="5.5" fill={INK} />
      <path d="M30 31.5l3-6" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
      <rect x="45" y="25" width="4.5" height="13" rx="2.2" fill={YEL} />
      <path d="M47 6.5a8 8 0 0 1 7 7" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M55.5 9.5l-1.5 4.5-4-2.5z" fill={INK} />
    </>
  ),
  heightStretch: ({ a, d }) => (
    <>
      <path d="M32 6l13 14h-7.5v24h-11V20H19z" fill={mix(a, 0.45)} />
      <g transform="rotate(-6 32 30)">
        <rect x="24" y="14" width="16" height="28" rx="4.5" fill={INK} />
        <rect x="26.5" y="17.5" width="11" height="20" rx="2" fill={a} />
      </g>
      <path d="M20 44c-2 4-1 9 3 12M44 44c2 4 1 9-3 12" stroke="#F2B48C" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M12 30h5M47 30h5M14 38h4M46 38h4" stroke={INK} strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
      <Sparkle x={52} y={12} s={4} fill={YEL} />
      <Sparkle x={12} y={14} s={3} />
    </>
  ),
  lightFlash: ({ a, d }) => (
    <>
      <Shadow c={d} rx={14} y={57} />
      {[-60, -30, 0, 30, 60].map((r) => <path key={r} d="M32 12V5" stroke={YEL_D} strokeWidth="3" strokeLinecap="round" transform={`rotate(${r} 32 22)`} />)}
      <rect x="20" y="16" width="24" height="40" rx="6" fill={INK} />
      <rect x="23" y="22" width="18" height="30" rx="2.5" fill={mix(a, 0.6)} />
      <circle cx="32" cy="19.2" r="1.6" fill={YEL} />
      <g transform="rotate(-25 46 30)">
        <rect x="40" y="16" width="6" height="16" rx="3" fill="#F2B48C" />
        <rect x="46.5" y="15" width="6" height="18" rx="3" fill="#F2B48C" />
        <rect x="53" y="17" width="5.5" height="16" rx="2.75" fill="#F2B48C" />
        <path d="M39 28h20v8a9 9 0 0 1-9 9h-2a9 9 0 0 1-9-9z" fill="#F2B48C" />
        <path d="M44 30v4M50 30v4" stroke="#D9906A" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </>
  ),
  marbleMaze: ({ a, d }) => (
    <>
      <Shadow c={d} rx={20} y={57} />
      <rect x="9" y="9" width="46" height="46" rx="8" fill="#A47148" />
      <rect x="13" y="13" width="38" height="38" rx="4" fill="#F3E9DC" />
      <path d="M13 24h14M37 13v13M24 24v14M24 38h16M40 38v-12h11M31 51v-6" stroke="#8B5E34" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="45.5" cy="45.5" r="3.6" fill={INK} />
      <circle cx="45.5" cy="45.5" r="2" fill={a} />
      <circle cx="19" cy="18.5" r="3.6" fill="#64748B" />
      <circle cx="18" cy="17.3" r="1.3" fill={W} />
      <path d="M22 30q4 6 10 4" stroke={a} strokeWidth="1.8" strokeDasharray="1.5 2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  pixelRun: ({ a, d }) => (
    <>
      <rect x="6" y="44" width="52" height="9" rx="2" fill={d} />
      <rect x="6" y="44" width="52" height="3" fill={mix(a, 0.5)} />
      <rect x="40" y="31" width="8" height="13" fill="#DC2626" />
      <rect x="49" y="36" width="7" height="8" fill="#F97316" />
      <g transform="translate(14 14)">
        <rect x="4" y="0" width="12" height="10" fill={INK} />
        <rect x="11" y="3" width="3" height="3" fill={W} />
        <rect x="2" y="10" width="15" height="9" fill={a} />
        <rect x="3" y="19" width="4" height="7" fill={INK} />
        <rect x="12" y="19" width="4" height="7" fill={INK} transform="rotate(-25 14 19)" />
      </g>
      <path d="M8 22h5M6 28h5" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M34 20q6-10 14 0" stroke={W} strokeWidth="2" strokeDasharray="2 3" fill="none" />
      <Sparkle x={52} y={13} s={4} fill={YEL} />
    </>
  ),
  blockStacker: ({ a, d }) => (
    <>
      <Shadow c={d} rx={16} y={57} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={14 + i * 2.5 + (i === 3 ? 4 : 0)} y={44 - i * 9} width={36 - i * 4} height="8" rx="2"
          fill={['#F472B6', '#FACC15', '#34D399', a][i]} />
      ))}
      <rect x="20" y="9" width="24" height="8" rx="2" fill={mix(a, 0.35)} />
      <path d="M14 13h4M46 13h4" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M32 19v5" stroke={INK} strokeWidth="2" strokeDasharray="2 2" />
      <Sparkle x={53} y={30} s={4} fill={YEL} />
    </>
  ),
  longJump: ({ a, d }) => (
    <>
      <rect x="4" y="46" width="22" height="10" fill="#C2410C" />
      <rect x="26" y="46" width="34" height="10" fill="#FDE68A" />
      <rect x="25" y="46" width="2" height="10" fill={W} />
      <path d="M14 42Q30 6 50 40" stroke={a} strokeWidth="2.5" strokeDasharray="3 3" fill="none" strokeLinecap="round" />
      <g transform="rotate(20 33 20)">
        <circle cx="33" cy="13" r="4" fill="#F2B48C" />
        <rect x="29" y="17" width="8" height="10" rx="3" fill={INK} />
        <path d="M30 26l-5 5M36 26l5 4" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <path d="M50 46v-6" stroke={d} strokeWidth="2" />
      <Sparkle x={52} y={13} s={4} fill={YEL} />
    </>
  ),
  skyJumper: ({ a, d }) => (
    <>
      {[[10, 50, '#16A34A'], [32, 38, '#16A34A'], [14, 26, '#F97316'], [36, 14, '#16A34A']].map(([x, y, c], i) => (
        <rect key={i} x={x} y={y} width="18" height="4" rx="2" fill={c} />
      ))}
      <rect x="22" y="22" width="12" height="13" rx="4" fill={a} />
      <rect x="25" y="25" width="2" height="3" fill={W} />
      <rect x="29" y="25" width="2" height="3" fill={W} />
      <path d="M28 42v6M24 44l4 4 4-4" stroke={d} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" transform="rotate(180 28 45)" />
      <Sparkle x={52} y={48} s={3.5} fill={YEL} />
      <Sparkle x={10} y={12} s={3} />
    </>
  ),
};

/** Bild eines Spiels. Fällt auf das Emoji zurück, falls (noch) keine Illustration existiert. */
export function GameArt({ game, size = 56, className = '', radius }) {
  if (!game) return null;
  const draw = ART[game.id];
  if (!draw) {
    return <span className={`game-art ${className}`} style={{ width: size, height: size, fontSize: size * 0.6, display: 'inline-grid', placeItems: 'center' }}>{game.icon}</span>;
  }
  const a = game.accent;
  const colors = { a, d: mix(a, 0.3, [0, 0, 0]), m: mix(a, 0.45) };
  const r = radius ?? (size <= 24 ? 7 : 16);
  return (
    <svg className={`game-art ${className}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={game.name}
      style={{ borderRadius: (r * size) / 64, flexShrink: 0, display: 'block' }}>
      <rect width="64" height="64" rx={r} fill={mix(a, 0.8)} />
      <circle cx="58" cy="6" r="18" fill={W} opacity="0.35" />
      <circle cx="4" cy="62" r="12" fill={W} opacity="0.25" />
      {draw(colors)}
    </svg>
  );
}

export const GAME_ART_IDS = Object.keys(ART);
