import {
  add,
  averageRotation,
  cross,
  dot,
  length,
  rotate,
  scale,
  subtract,
  unit,
  unrotate,
  type Matrix,
  type Vector,
} from '@/motion/rotation';
import { SCREEN_DISTANCE, UP } from '@/motion/setup';
import { type TrackerSample } from '@/motion/tracker-sample';

// A held-still reading, averaged over a moment to smooth out jitter.
export type Pose = { position: Vector; rotation?: Matrix };

// Three poses taken standing where visitors will: pointing at the centre of the screen, then
// holding the object out to the left and right while pointing at the top-left and bottom-right
// corners.
//
// - The centre pose says which of the tracker's axes runs out toward visitors (the one the
//   visitor stood furthest along), and which way the object points: whatever direction is
//   "forward" for the sensor inside it, at that moment it was pointing at the screen.
// - Moving from the left pose to the right one says which axis runs across the screen, and
//   which way is right.
// - The corner poses say where the screen's corners are. Wherever the object pointed at each
//   corner is that corner, so the screen's size and position (and the tracker's units) come out
//   of the poses, and the base can sit anywhere near the screen.
export type Calibration = {
  centre: Pose;
  topLeft: Pose;
  bottomRight: Pose;
};

export type CalibrationStep = keyof Calibration;
export const CALIBRATION_STEPS: CalibrationStep[] = ['centre', 'topLeft', 'bottomRight'];

// The average pose over a run of samples.
export function averagePose(samples: TrackerSample[]): Pose | null {
  if (samples.length === 0) return null;
  const position = scale(
    samples.reduce<Vector>((total, sample) => add(total, sample.position), [0, 0, 0]),
    1 / samples.length,
  );
  const rotations = samples.map((sample) => sample.rotation);
  if (rotations.some((rotation) => !rotation)) return { position };
  return { position, rotation: averageRotation(rotations as Matrix[]) };
}

const AXES: Vector[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

// The tracker axis (with its sign) closest to `direction`. The tracker's base is set square to
// the screen, so the room's directions run along its axes.
function nearestAxis(direction: Vector, choices = AXES): Vector {
  let best = choices[0];
  for (const axis of choices) if (Math.abs(dot(direction, axis)) > Math.abs(dot(direction, best))) best = axis;
  return scale(best, Math.sign(dot(direction, best)) || 1);
}

// The room as the tracker sees it: out of the screen toward the visitor, the visitor's right, and
// up, each along one of the tracker's axes.
type Room = { toward: Vector; right: Vector; up: Vector };

const rooms = new WeakMap<Calibration, Room>();

function roomFor(calibration: Calibration): Room {
  const known = rooms.get(calibration);
  if (known) return known;
  const { centre, topLeft, bottomRight } = calibration;
  const toward = nearestAxis(centre.position);
  const across = AXES.filter((axis) => Math.abs(dot(axis, toward)) < 0.5);
  // Up comes from setup.ts, unless that's the axis visitors stand along; then it's whichever axis
  // the left and right poses didn't move along.
  const sideways = subtract(bottomRight.position, topLeft.position);
  let up = Math.abs(dot(UP, toward)) < 0.5 ? unit(UP) : null;
  let right: Vector;
  if (up) {
    const level = across.filter((axis) => Math.abs(dot(axis, up!)) < 0.5);
    right = nearestAxis(sideways, level);
  } else {
    right = nearestAxis(sideways, across);
    const rest = across.find((axis) => Math.abs(dot(axis, right)) < 0.5)!;
    // Without a reliable up, take the one that makes a right-handed room (as trackers are).
    up = scale(rest, Math.sign(dot(cross(right, rest), toward)) || 1);
  }
  const room = { toward, right, up };
  rooms.set(calibration, room);
  return room;
}

// Where a pointer at `position`, pointing along `direction`, meets the screen: `across` grows to
// the visitor's right and `down` grows downward, both in the tracker's units. The screen stands
// upright, square to the visitor, SCREEN_DISTANCE beyond the tracker's base on the far side from
// the visitor. Null if the object isn't pointing toward it.
function screenHit(room: Room, position: Vector, direction: Vector) {
  const facing = dot(direction, room.toward);
  const away = dot(position, room.toward) + SCREEN_DISTANCE;
  // Pointing sideways, up, down or away from the screen: it never reaches it.
  if (facing > -0.1 || away <= 0) return null;
  const hit = add(position, scale(direction, -away / facing));
  return { across: dot(hit, room.right), down: -dot(hit, room.up) };
}

// Trackers disagree on whether their rotation turns the sensor's frame into the tracker's or the
// other way round, so both readings are tried (see pointerModel). `aim` is the direction the
// object pointed at the centre pose, in the tracker's frame.
const READINGS = [
  // The rotation turns sensor directions into tracker directions (as Polhemus angles do).
  (rotation: Matrix, centre: Matrix, aim: Vector) => rotate(rotation, unrotate(centre, aim)),
  // The rotation turns tracker directions into sensor directions.
  (rotation: Matrix, centre: Matrix, aim: Vector) => unrotate(rotation, rotate(centre, aim)),
];

type ScreenSpot = { across: number; down: number };

type PointerModel = {
  room: Room;
  direction: (rotation: Matrix) => Vector;
  topLeft: ScreenSpot;
  bottomRight: ScreenSpot;
};

// Straight at the screen, turned by `left` radians toward the visitor's left and `up` radians
// upward.
function turned(room: Room, left: number, up: number): Vector {
  const forward = scale(room.toward, -Math.cos(left) * Math.cos(up));
  const sideways = scale(room.right, -Math.sin(left) * Math.cos(up));
  return add(add(forward, sideways), scale(room.up, Math.sin(up)));
}

const toFraction = ({ topLeft: tl, bottomRight: br }: PointerModel, hit: ScreenSpot) => ({
  x: (hit.across - tl.across) / (br.across - tl.across),
  y: (hit.down - tl.down) / (br.down - tl.down),
});

// The model for one reading, given which way the object pointed at the centre pose, and where
// (as a fraction of the screen) the centre pose then lands.
function modelFor(calibration: Calibration, room: Room, reading: (typeof READINGS)[number], aim: Vector) {
  const { centre, topLeft, bottomRight } = calibration;
  const direction = (rotation: Matrix) => reading(rotation, centre.rotation!, aim);
  const tl = screenHit(room, topLeft.position, direction(topLeft.rotation!));
  const br = screenHit(room, bottomRight.position, direction(bottomRight.rotation!));
  const middle = screenHit(room, centre.position, aim);
  if (!tl || !br || !middle || br.across === tl.across || br.down === tl.down) return null;
  const model: PointerModel = { room, direction, topLeft: tl, bottomRight: br };
  return { model, centreLands: toFraction(model, middle) };
}

// Which way the object pointed at the centre pose isn't known exactly: visitors seldom hold it
// level and square to the screen. So it's solved for: the direction that makes the centre pose
// land on the middle of the screen, between where the corner poses pointed. A few rounds of
// Newton's method on the two angles, starting from straight at the screen.
function solveModel(calibration: Calibration, room: Room, reading: (typeof READINGS)[number]) {
  let left = 0;
  let up = 0;
  let found = modelFor(calibration, room, reading, turned(room, left, up));
  const step = 1e-4;
  for (let round = 0; round < 12 && found; round++) {
    const { x, y } = found.centreLands;
    const ex = x - 0.5;
    const ey = y - 0.5;
    if (Math.abs(ex) < 1e-4 && Math.abs(ey) < 1e-4) break;
    const byLeft = modelFor(calibration, room, reading, turned(room, left + step, up))?.centreLands;
    const byUp = modelFor(calibration, room, reading, turned(room, left, up + step))?.centreLands;
    if (!byLeft || !byUp) break;
    // How the landing spot moves per radian of each angle, then the step that cancels the error.
    const [a, b, c, d] = [(byLeft.x - x) / step, (byUp.x - x) / step, (byLeft.y - y) / step, (byUp.y - y) / step];
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-9) break;
    const nextLeft = left - (d * ex - b * ey) / det;
    const nextUp = up - (a * ey - c * ex) / det;
    // Visitors point within a reasonable angle of square-on; beyond that, stop rather than wander.
    if (Math.abs(nextLeft) > 1 || Math.abs(nextUp) > 1) break;
    const next = modelFor(calibration, room, reading, turned(room, nextLeft, nextUp));
    if (!next) break;
    [left, up, found] = [nextLeft, nextUp, next];
  }
  return found?.model ?? null;
}

const models = new WeakMap<Calibration, PointerModel | null>();

// How a calibration turns the object's rotation into a spot on the screen, or null if it can't
// (no rotations, or the corner poses weren't pointing at the screen).
//
// Of the two readings, the right one points left from the left pose and right from the right one,
// and higher at the top-left corner than at the bottom-right. The first is how Polhemus angles
// work, so it's kept unless the second clearly does better: the second only wins if it gets both
// right and the first gets neither.
function pointerModel(calibration: Calibration): PointerModel | null {
  if (models.has(calibration)) return models.get(calibration)!;
  const { centre, topLeft, bottomRight } = calibration;
  let best: PointerModel | null = null;
  let bestScore = -Infinity;
  if (centre.rotation && topLeft.rotation && bottomRight.rotation) {
    const room = roomFor(calibration);
    for (const [index, reading] of READINGS.entries()) {
      const model = solveModel(calibration, room, reading);
      if (!model) continue;
      const score =
        Number(model.bottomRight.across > model.topLeft.across) +
        Number(model.bottomRight.down > model.topLeft.down) +
        (index === 0 ? 1.5 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = model;
      }
    }
  }
  models.set(calibration, best);
  return best;
}

// How far the visitor held the object from the tracker's base at the centre pose, in the
// tracker's units. Swipes are measured as an angle seen from the base, so they scale with this.
const standingDistance = (calibration: Calibration) => Math.max(length(calibration.centre.position), 1e-6);

// Why a finished calibration can't be used, if it can't.
export function calibrationProblem(calibration: Calibration) {
  const { topLeft, bottomRight, centre } = calibration;
  const room = roomFor(calibration);
  const sideways = dot(subtract(bottomRight.position, topLeft.position), room.right);
  if (sideways < standingDistance(calibration) * 0.1) {
    return 'The object hardly moved between the left and right poses. Try again, holding it further out to each side.';
  }
  if (centre.rotation && topLeft.rotation && bottomRight.rotation) {
    const model = pointerModel(calibration);
    if (!model) {
      return 'The object didn’t seem to point at the screen during the corner steps. Try again, pointing it right at each glowing circle.';
    }
    const width = Math.abs(model.bottomRight.across - model.topLeft.across);
    const height = Math.abs(model.bottomRight.down - model.topLeft.down);
    if (width < standingDistance(calibration) * 0.1 || height < standingDistance(calibration) * 0.05) {
      return 'Pointing at the two corners came out too close together. Try again, pointing right at each glowing circle.';
    }
  }
  return null;
}

// Where the object is pointing, as a fraction of the screen: (0, 0) is the top-left corner and
// (1, 1) the bottom-right. Values past 0 or 1 are off the screen. Null if it isn't pointing at
// the screen at all. `aspect` is the screen's height divided by its width.
//
// With rotation it works like a laser pointer: the spot is where a line out of the object meets
// the screen, placed between where the corner poses pointed. Without rotation, the cursor follows
// the object's position instead, like its shadow on the screen.
export function screenPoint(calibration: Calibration, sample: TrackerSample, aspect: number) {
  const model = sample.rotation ? pointerModel(calibration) : null;
  if (model && sample.rotation) {
    const hit = screenHit(model.room, sample.position, model.direction(sample.rotation));
    return hit && toFraction(model, hit);
  }

  const { centre, topLeft, bottomRight } = calibration;
  const room = roomFor(calibration);
  const offset = subtract(sample.position, centre.position);
  const width = dot(subtract(bottomRight.position, topLeft.position), room.right);
  return {
    x: 0.5 + dot(offset, room.right) / width,
    y: 0.5 - dot(offset, room.up) / (Math.abs(width) * aspect),
  };
}

// How far the object has moved to the visitor's right of where it was at the centre pose, as a
// fraction of how far away the visitor stood: roughly the angle it has swept through as seen from
// the tracker's base, in radians. Negative is to the left. Being a ratio, it doesn't depend on
// the tracker's units.
export function sidewaysPosition(calibration: Calibration, position: Vector) {
  const offset = dot(subtract(position, calibration.centre.position), roomFor(calibration).right);
  return offset / standingDistance(calibration);
}
