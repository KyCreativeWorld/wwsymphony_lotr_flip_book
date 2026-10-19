import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const PAPER = '#e4cd9c';
const STAIN = '#9a6426';
const CREASE_SHADOW = '#6b4a1e';
const CREASE_LIGHT = '#fffaf0';
const FOXING = '#7a4a1c';

type Spine = 'left' | 'right';

type AgedPaperProps = {
  width: number;
  height: number;
  // Each page passes its own seed so no two pages are stained or creased the same way.
  seed: number;
  // The bound edge stays straight; the other three get a rough, deckled edge.
  spine: Spine;
};

// Deterministic pseudo-random numbers so a page looks the same on every render.
function seededRandom(seed: number) {
  let state = seed * 9301 + 49297;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The page outline, walked clockwise from the top-left corner.
function deckledEdge(width: number, height: number, spine: Spine, random: () => number) {
  const roughness = Math.max(1.5, width * 0.005);
  const phases = [random(), random(), random()].map((p) => p * Math.PI * 2);
  const wobble = (t: number) =>
    roughness *
    (0.5 +
      0.25 * Math.sin(t * 0.09 + phases[0]) +
      0.15 * Math.sin(t * 0.23 + phases[1]) +
      0.1 * Math.sin(t * 0.61 + phases[2]));

  const step = 6;
  const points: string[] = [];
  const add = (x: number, y: number) => points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);

  for (let x = 0; x <= width; x += step) add(x, wobble(x));
  for (let y = 0; y <= height; y += step) add(spine === 'right' ? width : width - wobble(y + 500), y);
  for (let x = width; x >= 0; x -= step) add(x, height - wobble(x + 1000));
  for (let y = height; y >= 0; y -= step) add(spine === 'left' ? 0 : wobble(y + 1500), y);

  return `M${points.join(' L')} Z`;
}

// A blotchy, roughly round outline for a tea stain.
function stainBlob(cx: number, cy: number, radius: number, random: () => number) {
  const lobes = [random(), random(), random()].map((p) => p * Math.PI * 2);
  const points: string[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r =
      radius *
      (1 + 0.12 * Math.sin(a * 3 + lobes[0]) + 0.07 * Math.sin(a * 5 + lobes[1]) + 0.04 * Math.sin(a * 9 + lobes[2]));
    points.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${points.join(' L')} Z`;
}

// Foxing: the small rust-brown spots old paper picks up, scattered and loosely clustered.
function makeFoxing(width: number, height: number, random: () => number) {
  const spots: { x: number; y: number; r: number; opacity: number }[] = [];
  const clusters = 3 + Math.floor(random() * 4);
  for (let c = 0; c < clusters; c++) {
    const cx = random() * width;
    const cy = random() * height;
    const spread = width * (0.04 + random() * 0.1);
    const count = 4 + Math.floor(random() * 10);
    for (let i = 0; i < count; i++) {
      spots.push({
        x: cx + (random() - 0.5) * spread * 2,
        y: cy + (random() - 0.5) * spread * 2,
        r: 0.5 + random() * 2.2,
        opacity: 0.08 + random() * 0.17,
      });
    }
  }
  // A light dusting across the whole sheet.
  for (let i = 0; i < 40; i++) {
    spots.push({ x: random() * width, y: random() * height, r: 0.4 + random() * 1, opacity: 0.06 + random() * 0.1 });
  }
  return spots;
}

// Fine paper grain: tiny light and dark flecks.
function makeGrain(width: number, height: number, random: () => number) {
  return Array.from({ length: Math.round((width * height) / 900) }, () => ({
    x: random() * width,
    y: random() * height,
    r: 0.3 + random() * 0.6,
    light: random() > 0.5,
  }));
}

function makeStains(width: number, height: number, random: () => number) {
  const count = 2 + Math.floor(random() * 3);
  return Array.from({ length: count }, () => {
    const radius = width * (0.08 + random() * 0.2);
    return {
      path: stainBlob(random() * width, random() * height, radius, random),
      // Some stains are faint washes, others have the faint ring of a dried cup.
      strength: 0.3 + random() * 0.35,
      ringed: random() > 0.4,
    };
  });
}

// Short creases running in from the outer edges, each drawn as a shadow with a highlight beside it.
function makeCreases(width: number, height: number, spine: Spine, random: () => number) {
  const creases: { d: string; dx: number; dy: number }[] = [];
  const maxLength = width * 0.09;
  const edges: ('top' | 'bottom' | 'outer')[] = ['top', 'bottom', 'outer', 'outer', 'top', 'bottom'];
  const count = 9 + Math.floor(random() * 6);

  for (let i = 0; i < count; i++) {
    const edge = edges[i % edges.length];
    const length = maxLength * (0.35 + random() * 0.65);
    const bend = (random() - 0.5) * length * 0.6;
    const slant = (random() - 0.5) * length * 0.8;
    let x0: number;
    let y0: number;
    let x1: number;
    let y1: number;

    if (edge === 'outer') {
      const fromLeft = spine === 'right';
      x0 = fromLeft ? 0 : width;
      y0 = random() * height;
      x1 = fromLeft ? length : width - length;
      y1 = y0 + slant;
    } else {
      x0 = random() * width;
      y0 = edge === 'top' ? 0 : height;
      x1 = x0 + slant;
      y1 = edge === 'top' ? length : height - length;
    }
    const mx = (x0 + x1) / 2 + bend;
    const my = (y0 + y1) / 2 + bend;
    const vertical = edge !== 'outer';
    creases.push({
      d: `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`,
      dx: vertical ? 1 : 0,
      dy: vertical ? 0 : 1,
    });
  }

  // A worn, slightly folded outer corner at the top and bottom.
  const cornerX = spine === 'left' ? width : 0;
  const inward = spine === 'left' ? -1 : 1;
  const fold = width * (0.05 + random() * 0.04);
  creases.push(
    { d: `M${cornerX + inward * fold} 0 Q${cornerX + inward * fold * 0.4} ${fold * 0.4} ${cornerX} ${fold}`, dx: 1, dy: 1 },
    {
      d: `M${cornerX + inward * fold} ${height} Q${cornerX + inward * fold * 0.4} ${height - fold * 0.4} ${cornerX} ${height - fold}`,
      dx: 1,
      dy: -1,
    },
  );
  return creases;
}

// The paper itself: rough edges and tea stains. Goes behind the page's content.
export function AgedPaper({ width, height, seed, spine }: AgedPaperProps) {
  const random = seededRandom(seed);
  const edge = deckledEdge(width, height, spine, random);
  const stains = makeStains(width, height, random);
  const foxing = makeFoxing(width, height, random);
  const grain = makeGrain(width, height, random);
  const id = (name: string) => `${name}-${seed}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={id('wash')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={STAIN} stopOpacity={0.03} />
            <Stop offset="0.8" stopColor={STAIN} stopOpacity={0.06} />
            <Stop offset="1" stopColor={STAIN} stopOpacity={0.01} />
          </RadialGradient>
          <RadialGradient id={id('ring')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={STAIN} stopOpacity={0.02} />
            <Stop offset="0.82" stopColor={STAIN} stopOpacity={0.05} />
            <Stop offset="0.94" stopColor={STAIN} stopOpacity={0.12} />
            <Stop offset="1" stopColor={STAIN} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={id('age')} cx="50%" cy="50%" r="75%">
            <Stop offset="0" stopColor="#fff2d6" stopOpacity={0.1} />
            <Stop offset="0.5" stopColor={STAIN} stopOpacity={0.06} />
            <Stop offset="0.8" stopColor={STAIN} stopOpacity={0.22} />
            <Stop offset="1" stopColor="#5e3711" stopOpacity={0.5} />
          </RadialGradient>
        </Defs>

        <Path d={edge} fill={PAPER} />
        {stains.map((stain, i) => (
          <Path
            key={i}
            d={stain.path}
            fill={`url(#${id(stain.ringed ? 'ring' : 'wash')})`}
            opacity={stain.strength}
          />
        ))}
        {grain.map((fleck, i) => (
          <Circle
            key={`g${i}`}
            cx={fleck.x}
            cy={fleck.y}
            r={fleck.r}
            fill={fleck.light ? '#fff6e0' : FOXING}
            opacity={fleck.light ? 0.25 : 0.08}
          />
        ))}
        {foxing.map((spot, i) => (
          <Circle key={`f${i}`} cx={spot.x} cy={spot.y} r={spot.r} fill={FOXING} opacity={spot.opacity} />
        ))}
        <Path d={edge} fill={`url(#${id('age')})`} />
        {/* Browned, brittle edges. */}
        <Path d={edge} fill="none" stroke="#5e3711" strokeOpacity={0.35} strokeWidth={5} />
        <Path d={edge} fill="none" stroke="#5e3711" strokeOpacity={0.6} strokeWidth={1.5} />
      </Svg>
    </View>
  );
}

// Creases and darkened edges laid over the page's content, so they show across maps and photos too.
export function PaperWear({ width, height, seed, spine }: AgedPaperProps) {
  const random = seededRandom(seed + 7919);
  const creases = makeCreases(width, height, spine, random);
  const id = (name: string) => `${name}-${seed}`;
  const spineIsLeft = spine === 'left';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={id('edge')} cx={spineIsLeft ? '40%' : '60%'} cy="50%" r="70%">
            <Stop offset="0.65" stopColor={STAIN} stopOpacity={0} />
            <Stop offset="1" stopColor="#5e3711" stopOpacity={0.35} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill={`url(#${id('edge')})`} />
        {creases.map((crease, i) => (
          <G key={i}>
            <Path d={crease.d} stroke={CREASE_SHADOW} strokeOpacity={0.28} strokeWidth={1.1} fill="none" />
            <Path
              d={crease.d}
              stroke={CREASE_LIGHT}
              strokeOpacity={0.55}
              strokeWidth={0.9}
              fill="none"
              transform={`translate(${crease.dx} ${crease.dy})`}
            />
          </G>
        ))}
      </Svg>
    </View>
  );
}
