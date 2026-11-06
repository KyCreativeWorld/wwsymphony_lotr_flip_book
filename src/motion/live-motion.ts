import { eulerMatrix, quaternionMatrix, type Matrix, type Vector } from '@/motion/rotation';
import { type TrackerSample } from '@/motion/tracker-sample';

// Readings from a LiveMotion motion server, the class's tracking server that
// motioncapture/js/LiveMotion.js and ClientApp.js connect to. The server streams JSON over a
// WebSocket, and each tracked object arrives as a "prop" with a position:
//
//   {"props": [{"id": 1, "pos": {"x": 1.2, "y": 3.4, "z": 5.6}, ...}]}
//
// The book follows the first prop in each message.

export const LIVE_MOTION_DEFAULT_URL = 'ws://localhost:8080';

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields => typeof value === 'object' && value !== null;
const toNumber = (value: unknown) => (typeof value === 'number' ? value : Number(value));
const allFinite = (values: number[]) => values.every(Number.isFinite);
const degrees = (radians: number) => (radians * 180) / Math.PI;

// Azimuth, elevation and roll in degrees (Polhemus order: turning about z, then y, then x) from a
// rotation quaternion.
function quaternionAngles({ x, y, z, w }: { x: number; y: number; z: number; w: number }): Vector {
  return [
    degrees(Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))),
    degrees(Math.asin(Math.max(-1, Math.min(1, 2 * (w * y - z * x))))),
    degrees(Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y))),
  ];
}

// Which way a prop points, if it says: its angles for the readout, and its rotation for the
// pointing maths. Servers name this differently, so a few common shapes are accepted: a
// quaternion {x, y, z, w}, or angles {azimuth, elevation, roll} / {yaw, pitch, roll}.
function propOrientation(prop: Fields): { orientation: Vector; rotation: Matrix } | undefined {
  for (const key of ['rot', 'rotation', 'quat', 'quaternion', 'ori', 'orientation']) {
    const value = prop[key];
    if (!isObject(value)) continue;
    if ('w' in value) {
      const [x, y, z, w] = [value.x, value.y, value.z, value.w].map(toNumber);
      // Straight from the quaternion, without going through angles, which jump near ±180°.
      if (allFinite([x, y, z, w])) {
        return { orientation: quaternionAngles({ x, y, z, w }), rotation: quaternionMatrix({ x, y, z, w }) };
      }
    }
    const angles = [value.azimuth ?? value.yaw, value.elevation ?? value.pitch, value.roll ?? 0].map(toNumber);
    if (allFinite(angles)) return { orientation: angles as Vector, rotation: eulerMatrix(angles as Vector) };
  }
  return undefined;
}

// The reading in a LiveMotion message, or null if it has no tracked props (for example a
// message about skeletons or touches, which the book doesn't use).
export function liveMotionSample(data: Fields, time: number): TrackerSample | null {
  const prop = Array.isArray(data.props) ? data.props[0] : undefined;
  if (!isObject(prop) || !isObject(prop.pos)) return null;
  const position = [prop.pos.x, prop.pos.y, prop.pos.z].map(toNumber);
  if (!allFinite(position)) return null;
  return {
    position: position as Vector,
    ...propOrientation(prop),
    objectCount: (data.props as unknown[]).length,
    time,
  };
}
