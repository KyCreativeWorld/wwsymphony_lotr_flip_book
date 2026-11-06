import {
  averageRotation,
  dot,
  length,
  rotate,
  scale,
  subtract,
  add,
  unrotate,
  type Matrix,
  type Vector,
} from '@/motion/rotation';
import { TOWARD_VISITOR, UP, VISITOR_RIGHT } from '@/motion/setup';
import { type TrackerSample } from '@/motion/tracker-sample';

// A held-still reading, averaged over a moment to smooth out jitter.
export type Pose = { position: Vector; rotation?: Matrix };

// Three poses taken standing where visitors will: pointing at the centre of the screen, then
// holding the object out to the left and right while pointing at the top-left and bottom-right
// corners.
//
// - The centre pose tells which way the object points: whatever direction is "forward" for the
//   sensor inside it, at that moment it was pointing at the screen.
// - The corner poses tell where the screen's corners are. Wherever the object pointed at each
//   corner is that corner, so the screen's size and position (and the tracker's units) come out
//   of the poses, and the base can sit anywhere near the screen.
export type Calibration = {
  centre: Pose;
  topLeft: Pose;
  bottomRight: Pose;
};

export type CalibrationStep = keyof Calibration;
export const CALIBRATION_STEPS: CalibrationStep[] = ['centre', 'topLeft', 'bottomRight'];

const towardVisitor = TOWARD_VISITOR;
const forward = scale(TOWARD_VISITOR, -1);

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

// Where a pointer at `position`, pointing along `direction`, meets the screen, in the visitor's
// view of the screen: `across` grows to the right and `down` grows downward, both in the
// tracker's units. The screen is taken to stand upright where the tracker's base is. Null if the
// object isn't pointing toward the screen.
function screenHit(position: Vector, direction: Vector) {
  const facing = dot(direction, towardVisitor);
  const away = dot(position, towardVisitor);
  // Pointing sideways, up, down or away from the screen: it never reaches it.
  if (facing > -0.1 || away <= 0) return null;
  const hit = add(position, scale(direction, -away / facing));
  return { across: dot(hit, VISITOR_RIGHT), down: -dot(hit, UP) };
}

// Trackers disagree on whether their rotation turns the sensor's frame into the tracker's or the
// other way round, so both readings are tried, and calibration keeps the one where pointing at
// the top-left corner lands above pointing at the bottom-right. `aim` is the direction the object
// pointed at the centre pose, in the tracker's frame.
const READINGS = [
  // The rotation turns sensor directions into tracker directions.
  (rotation: Matrix, centre: Matrix, aim: Vector) => rotate(rotation, unrotate(centre, aim)),
  // The rotation turns tracker directions into sensor directions.
  (rotation: Matrix, centre: Matrix, aim: Vector) => unrotate(rotation, rotate(centre, aim)),
];

type ScreenSpot = { across: number; down: number };

type PointerModel = {
  direction: (rotation: Matrix) => Vector;
  topLeft: ScreenSpot;
  bottomRight: ScreenSpot;
};

// `forward` turned by `left` radians toward the visitor's left and `up` radians upward.
function turned(left: number, up: number): Vector {
  const sideways = scale(VISITOR_RIGHT, -Math.sin(left) * Math.cos(up));
  const upward = scale(UP, Math.sin(up));
  return add(add(scale(forward, Math.cos(left) * Math.cos(up)), sideways), upward);
}

// The model for one reading, given which way the object pointed at the centre pose, and where
// (as a fraction of the screen) the centre pose then lands.
function modelFor(calibration: Calibration, reading: (typeof READINGS)[number], aim: Vector) {
  const { centre, topLeft, bottomRight } = calibration;
  const direction = (rotation: Matrix) => reading(rotation, centre.rotation!, aim);
  const tl = screenHit(topLeft.position, direction(topLeft.rotation!));
  const br = screenHit(bottomRight.position, direction(bottomRight.rotation!));
  const middle = screenHit(centre.position, aim);
  if (!tl || !br || !middle || br.across === tl.across || br.down === tl.down) return null;
  const model: PointerModel = { direction, topLeft: tl, bottomRight: br };
  return { model, centreLands: toFraction(model, middle) };
}

const toFraction = ({ topLeft: tl, bottomRight: br }: PointerModel, hit: ScreenSpot) => ({
  x: (hit.across - tl.across) / (br.across - tl.across),
  y: (hit.down - tl.down) / (br.down - tl.down),
});

// Which way the object pointed at the centre pose isn't known exactly: visitors seldom hold it
// level and square to the screen. So it's solved for: the direction that makes the centre pose
// land on the middle of the screen, between where the corner poses pointed. A few rounds of
// Newton's method on the two angles, starting from straight at the screen.
function solveModel(calibration: Calibration, reading: (typeof READINGS)[number]) {
  let left = 0;
  let up = 0;
  let found = modelFor(calibration, reading, turned(left, up));
  const step = 1e-4;
  for (let round = 0; round < 12 && found; round++) {
    const { x, y } = found.centreLands;
    const ex = x - 0.5;
    const ey = y - 0.5;
    if (Math.abs(ex) < 1e-4 && Math.abs(ey) < 1e-4) break;
    const byLeft = modelFor(calibration, reading, turned(left + step, up))?.centreLands;
    const byUp = modelFor(calibration, reading, turned(left, up + step))?.centreLands;
    if (!byLeft || !byUp) break;
    // How the landing spot moves per radian of each angle, then the step that cancels the error.
    const [a, b, c, d] = [(byLeft.x - x) / step, (byUp.x - x) / step, (byLeft.y - y) / step, (byUp.y - y) / step];
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-9) break;
    const nextLeft = left - (d * ex - b * ey) / det;
    const nextUp = up - (a * ey - c * ex) / det;
    // Visitors point within a reasonable angle of square-on; beyond that, stop rather than wander.
    if (Math.abs(nextLeft) > 1 || Math.abs(nextUp) > 1) break;
    const next = modelFor(calibration, reading, turned(nextLeft, nextUp));
    if (!next) break;
    [left, up, found] = [nextLeft, nextUp, next];
  }
  return found?.model ?? null;
}

const models = new WeakMap<Calibration, PointerModel | null>();

// How a calibration turns the object's rotation into a spot on the screen, or null if it can't
// (no rotations, or the corner poses weren't pointing at the screen).
function pointerModel(calibration: Calibration): PointerModel | null {
  if (models.has(calibration)) return models.get(calibration)!;
  const { centre, topLeft, bottomRight } = calibration;
  let best: PointerModel | null = null;
  let bestHeight = -Infinity;
  if (centre.rotation && topLeft.rotation && bottomRight.rotation) {
    for (const reading of READINGS) {
      const model = solveModel(calibration, reading);
      if (!model) continue;
      // Top-left should be above bottom-right: the more so, the more right this reading is.
      const height = model.bottomRight.down - model.topLeft.down;
      if (height > bestHeight) {
        bestHeight = height;
        best = model;
      }
    }
  }
  models.set(calibration, best);
  return best;
}

// How far the visitor stood from the screen at the centre pose, in the tracker's units.
const standingDistance = (calibration: Calibration) =>
  Math.max(dot(calibration.centre.position, towardVisitor), length(calibration.centre.position) * 0.1, 1e-6);

// +1 if the visitor's right (from setup.ts) matches the way the object moved from the left pose
// to the right one, -1 if the poses say it's the other way.
const rightSign = (calibration: Calibration) =>
  Math.sign(dot(subtract(calibration.bottomRight.position, calibration.topLeft.position), VISITOR_RIGHT)) || 1;

// Why a finished calibration can't be used, if it can't.
export function calibrationProblem(calibration: Calibration) {
  const { topLeft, bottomRight, centre } = calibration;
  const sideways = Math.abs(dot(subtract(bottomRight.position, topLeft.position), VISITOR_RIGHT));
  if (sideways < standingDistance(calibration) * 0.1) {
    return 'The object hardly moved between the left and right poses. Try again, holding it further out to each side.';
  }
  if (centre.rotation && topLeft.rotation && bottomRight.rotation) {
    const model = pointerModel(calibration);
    if (!model) {
      return 'The object didn’t seem to point at the screen during the corner steps. Try again, pointing it right at each glowing circle.';
    }
    const width = Math.abs(model.bottomRight.across - model.topLeft.across);
    const height = model.bottomRight.down - model.topLeft.down;
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
    const hit = screenHit(sample.position, model.direction(sample.rotation));
    return hit && toFraction(model, hit);
  }

  const { centre, topLeft, bottomRight } = calibration;
  const offset = subtract(sample.position, centre.position);
  const width = dot(subtract(bottomRight.position, topLeft.position), VISITOR_RIGHT);
  return {
    x: 0.5 + dot(offset, VISITOR_RIGHT) / width,
    y: 0.5 - dot(offset, UP) / (Math.abs(width) * aspect),
  };
}

// How far the object has moved to the visitor's right of where it was at the centre pose, as a
// fraction of how far away the visitor stood: roughly the angle it has swept through as seen from
// the tracker's base, in radians. Negative is to the left. Being a ratio, it doesn't depend on
// the tracker's units.
export function sidewaysPosition(calibration: Calibration, position: Vector) {
  const offset = dot(subtract(position, calibration.centre.position), VISITOR_RIGHT);
  return (rightSign(calibration) * offset) / standingDistance(calibration);
}
