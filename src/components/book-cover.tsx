import { type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

// Artwork is drawn in a fixed 300×420 space and stretched to the cover's size.
const WIDTH = 300;
const HEIGHT = 420;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;

export const LEATHER = '#5a0f0e';
export const LEATHER_DARK = '#3d0808';
const EMBOSS_SHADOW = '#1a0202';
const ENDPAPER = '#d9c69c';

const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
});

type Side = 'left' | 'right';

// Deterministic pseudo-random numbers so the leather grain doesn't shift between renders.
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seededRandom(7);
const GRAIN = Array.from({ length: 320 }, (_, i) => ({
  x: random() * WIDTH,
  y: random() * HEIGHT,
  r: 0.4 + random() * 1.1,
  light: i % 3 === 0,
}));

function ellipsePoint(rx: number, ry: number, t: number) {
  return { x: CX + rx * Math.cos(t), y: CY + ry * Math.sin(t) };
}

function tangentDegrees(rx: number, ry: number, t: number) {
  return (Math.atan2(ry * Math.cos(t), -rx * Math.sin(t)) * 180) / Math.PI;
}

// A wavy vine running around the oval, with leaves sprouting on alternating sides.
const VINE_RX = 87;
const VINE_RY = 128;
const VINE_WAVES = 24;
const VINE_PATH = Array.from({ length: 361 }, (_, i) => {
  const t = (i / 360) * Math.PI * 2;
  const wave = 3 * Math.sin(VINE_WAVES * t);
  const p = ellipsePoint(VINE_RX + wave, VINE_RY + wave, t);
  return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
}).join(' ');
const VINE_LEAVES = Array.from({ length: VINE_WAVES * 2 }, (_, i) => {
  const t = ((i + 0.5) / (VINE_WAVES * 2)) * Math.PI * 2;
  const wave = 3 * Math.sin(VINE_WAVES * t);
  const p = ellipsePoint(VINE_RX + wave, VINE_RY + wave, t);
  return { ...p, angle: tangentDegrees(VINE_RX, VINE_RY, t) + (i % 2 === 0 ? 40 : -140) };
});

const BEADS = Array.from({ length: 72 }, (_, i) =>
  ellipsePoint(99.5, 141, (i / 72) * Math.PI * 2),
);

const BORDER_DOTS: { x: number; y: number }[] = [];
for (let x = 18; x <= WIDTH - 18; x += 7) {
  BORDER_DOTS.push({ x, y: 18 }, { x, y: HEIGHT - 18 });
}
for (let y = 25; y <= HEIGHT - 25; y += 7) {
  BORDER_DOTS.push({ x: 18, y }, { x: WIDTH - 18, y });
}

const CORNER_TRANSFORMS = [
  '',
  `translate(${WIDTH} 0) scale(-1 1)`,
  `translate(0 ${HEIGHT}) scale(1 -1)`,
  `translate(${WIDTH} ${HEIGHT}) scale(-1 -1)`,
];

// Fleurons point outward from the oval at the four compass points.
const FLEURON_TRANSFORMS = [
  `translate(${CX} ${CY - 146})`,
  `translate(${CX} ${CY + 146}) rotate(180)`,
  `translate(${CX - 104} ${CY}) rotate(-90)`,
  `translate(${CX + 104} ${CY}) rotate(90)`,
];

function CornerFlourish({ color }: { color: string }) {
  return (
    <G transform="translate(22 22)">
      <Path d="M6 64 C6 32 32 6 64 6" stroke={color} strokeWidth={1.2} fill="none" />
      <Path
        d="M14 14 C30 12 36 28 27 33 C20 37 15 29 21 26"
        stroke={color}
        strokeWidth={1.2}
        fill="none"
      />
      <Path d="M30 12 Q42 5 54 13 Q42 19 30 12 Z" fill={color} />
      <Path d="M12 30 Q5 42 13 54 Q19 42 12 30 Z" fill={color} />
      <Path d="M58 6 Q64 2 70 6 Q64 10 58 6 Z" fill={color} />
      <Path d="M6 58 Q2 64 6 70 Q10 64 6 58 Z" fill={color} />
      <Circle cx={9} cy={9} r={2.5} fill={color} />
    </G>
  );
}

function Fleuron({ color }: { color: string }) {
  return (
    <G>
      <Path d="M0 0 C-6 -6 -6 -14 0 -20 C6 -14 6 -6 0 0 Z" fill={color} />
      <Path d="M0 -3 C-9 -1 -15 -7 -11 -13 C-9 -15 -6 -14 -6 -11" stroke={color} strokeWidth={1} fill="none" />
      <Path d="M0 -3 C9 -1 15 -7 11 -13 C9 -15 6 -14 6 -11" stroke={color} strokeWidth={1} fill="none" />
    </G>
  );
}

// Every gold-tooled line on the cover, drawn in one color so it can be stamped twice:
// once in shadow for the pressed-in look, and once in gold on top.
function Tooling({ color, center }: { color: string; center: (color: string) => ReactNode }) {
  return (
    <G>
      <Rect x={14} y={14} width={WIDTH - 28} height={HEIGHT - 28} rx={4} stroke={color} strokeWidth={1.6} fill="none" />
      <Rect x={22} y={22} width={WIDTH - 44} height={HEIGHT - 44} rx={2} stroke={color} strokeWidth={0.8} fill="none" />
      {BORDER_DOTS.map((dot, i) => (
        <Circle key={i} cx={dot.x} cy={dot.y} r={1.1} fill={color} />
      ))}
      {CORNER_TRANSFORMS.map((transform, i) => (
        <G key={i} transform={transform}>
          <CornerFlourish color={color} />
        </G>
      ))}

      <Ellipse cx={CX} cy={CY} rx={104} ry={146} stroke={color} strokeWidth={1.4} fill="none" />
      {BEADS.map((bead, i) => (
        <Circle key={i} cx={bead.x} cy={bead.y} r={1.3} fill={color} />
      ))}
      <Ellipse cx={CX} cy={CY} rx={95} ry={136} stroke={color} strokeWidth={1} fill="none" />
      <Path d={VINE_PATH} stroke={color} strokeWidth={0.9} fill="none" />
      {VINE_LEAVES.map((leaf, i) => (
        <Path
          key={i}
          d="M0 0 Q4 -3 9 0 Q4 3 0 0 Z"
          fill={color}
          transform={`translate(${leaf.x.toFixed(2)} ${leaf.y.toFixed(2)}) rotate(${leaf.angle.toFixed(1)})`}
        />
      ))}
      <Ellipse cx={CX} cy={CY} rx={79} ry={119} stroke={color} strokeWidth={1.2} fill="none" />
      <Ellipse cx={CX} cy={CY} rx={75} ry={115} stroke={color} strokeWidth={0.6} fill="none" />
      {FLEURON_TRANSFORMS.map((transform, i) => (
        <G key={i} transform={transform}>
          <Fleuron color={color} />
        </G>
      ))}

      {center(color)}
    </G>
  );
}

function TitleBlock(color: string) {
  return (
    <G>
      <SvgText x={CX} y={172} fill={color} fontFamily={SERIF} fontSize={22} fontStyle="italic" textAnchor="middle">
        There and
      </SvgText>
      <SvgText x={CX} y={198} fill={color} fontFamily={SERIF} fontSize={22} fontStyle="italic" textAnchor="middle">
        Back Again
      </SvgText>
      <Path d="M108 214 H141 M159 214 H192" stroke={color} strokeWidth={0.8} />
      <Path d="M150 208 L156 214 L150 220 L144 214 Z" fill={color} />
      <SvgText x={CX} y={240} fill={color} fontFamily={SERIF} fontSize={11} letterSpacing={1} textAnchor="middle">
        A HOBBIT&apos;S TALE
      </SvgText>
      <SvgText x={CX} y={258} fill={color} fontFamily={SERIF} fontSize={10} fontStyle="italic" textAnchor="middle">
        by Bilbo Baggins
      </SvgText>
    </G>
  );
}

// The round green door of Bag End, rendered in gold.
function RoundDoor(color: string) {
  const planks = [-20, -10, 0, 10, 20];
  return (
    <G>
      <Circle cx={CX} cy={CY - 8} r={40} stroke={color} strokeWidth={1.2} strokeDasharray="4 2" fill="none" />
      <Circle cx={CX} cy={CY - 8} r={35} stroke={color} strokeWidth={1.8} fill="none" />
      <Circle cx={CX} cy={CY - 8} r={30} stroke={color} strokeWidth={0.8} fill="none" />
      {planks.map((dx) => {
        const half = Math.sqrt(30 * 30 - dx * dx);
        return (
          <Path key={dx} d={`M${CX + dx} ${CY - 8 - half} V${CY - 8 + half}`} stroke={color} strokeWidth={0.6} />
        );
      })}
      <Circle cx={CX} cy={CY - 8} r={3.5} fill={color} />
      <SvgText x={CX} y={CY + 56} fill={color} fontFamily={SERIF} fontSize={11} letterSpacing={1} textAnchor="middle">
        BAG END
      </SvgText>
    </G>
  );
}

function LeatherCover({ spine, center }: { spine: Side; center: (color: string) => ReactNode }) {
  const spineX = spine === 'left' ? ['0', '0.12'] : ['1', '0.88'];
  // Gradient ids are global on web, so each cover gets its own.
  const id = (name: string) => `${name}-${spine}`;
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={id('leather')} cx="50%" cy="45%" r="75%">
          <Stop offset="0" stopColor="#7a1a17" />
          <Stop offset="0.55" stopColor={LEATHER} />
          <Stop offset="1" stopColor="#2b0404" />
        </RadialGradient>
        <LinearGradient id={id('gold')} x1="0" y1="0" x2={WIDTH} y2={HEIGHT} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#f0d78c" />
          <Stop offset="0.3" stopColor="#b8893a" />
          <Stop offset="0.55" stopColor="#e8c877" />
          <Stop offset="0.8" stopColor="#9c6f2a" />
          <Stop offset="1" stopColor="#d9b764" />
        </LinearGradient>
        <LinearGradient id={id('spine')} x1={spineX[0]} y1="0" x2={spineX[1]} y2="0">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.55} />
          <Stop offset="0.5" stopColor="#000000" stopOpacity={0.15} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      <Rect width={WIDTH} height={HEIGHT} fill={`url(#${id('leather')})`} />
      {GRAIN.map((speck, i) => (
        <Circle
          key={i}
          cx={speck.x}
          cy={speck.y}
          r={speck.r}
          fill={speck.light ? '#ffffff' : '#000000'}
          opacity={speck.light ? 0.04 : 0.12}
        />
      ))}
      {/* Blind-tooled outer line, pressed in without gold. */}
      <Rect x={8} y={8} width={WIDTH - 16} height={HEIGHT - 16} rx={5} stroke={EMBOSS_SHADOW} strokeWidth={1} opacity={0.6} fill="none" />

      <G transform="translate(0.9 0.9)" opacity={0.75}>
        <Tooling color={EMBOSS_SHADOW} center={center} />
      </G>
      <Tooling color={`url(#${id('gold')})`} center={center} />

      <Rect width={WIDTH} height={HEIGHT} fill={`url(#${id('spine')})`} />
    </Svg>
  );
}

export function FrontCover() {
  return <LeatherCover spine="left" center={TitleBlock} />;
}

export function BackCover() {
  return <LeatherCover spine="right" center={RoundDoor} />;
}

// The inside of a cover: leather turned in around the edges, with a paper endpaper glued over it.
export function InsideCover({ spine }: { spine: Side }) {
  return (
    <View style={[styles.inside, spine === 'left' ? styles.insideSpineLeft : styles.insideSpineRight]}>
      <View style={styles.endpaper} />
    </View>
  );
}

const styles = StyleSheet.create({
  inside: {
    flex: 1,
    backgroundColor: LEATHER_DARK,
    padding: 8,
  },
  insideSpineLeft: {
    paddingLeft: 0,
  },
  insideSpineRight: {
    paddingRight: 0,
  },
  endpaper: {
    flex: 1,
    backgroundColor: ENDPAPER,
  },
});
