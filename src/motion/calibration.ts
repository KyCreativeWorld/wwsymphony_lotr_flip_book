import { SCREEN_WIDTH, TRACKER_DISTANCE } from '@/motion/setup';
import { type TrackerSample, type Vector } from '@/motion/tracker-sample';

// A held-still reading, averaged over a moment to smooth out jitter.
export type Pose = { position: Vector; orientation?: Vector };

// Three poses taken standing where visitors will: pointing at the centre of the screen, then
// holding the object out to the left and right while pointing at the top-left and bottom-right
// corners. The centre sets where "straight ahead" is, and the two sides set which way is right
// and down (the tracker could be mounted either way up). How far the cursor and swipes move comes
// from the measurements in setup.ts, not from these poses.
export type Calibration = {
  centre: Pose;
  topLeft: Pose;
  bottomRight: Pose;
};

export type CalibrationStep = keyof Calibration;
export const CALIBRATION_STEPS: CalibrationStep[] = ['centre', 'topLeft', 'bottomRight'];

// The steepest turn from straight ahead the cursor follows (degrees). Past it, tan() races off
// towards infinity and then flips sign.
const MAX_TURN = 80;

const subtract = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vector, k: number): Vector => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: Vector, b: Vector): Vector => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vector) => scale(a, 1 / (Math.hypot(...a) || 1));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const radians = (degrees: number) => (degrees * Math.PI) / 180;

// The angle `degrees` moved to within 180° of `reference`, so a turn across ±180° doesn't jump
// all the way round.
const unwrap = (degrees: number, reference: number) => degrees - 360 * Math.round((degrees - reference) / 360);

// The average pose over a run of samples.
export function averagePose(samples: TrackerSample[]): Pose | null {
  if (samples.length === 0) return null;
  const sum = (pick: (sample: TrackerSample) => Vector) =>
    samples.reduce<Vector>((total, sample) => {
      const value = pick(sample);
      return [total[0] + value[0], total[1] + value[1], total[2] + value[2]];
    }, [0, 0, 0]);
  const position = scale(sum((sample) => sample.position), 1 / samples.length);
  const first = samples[0].orientation;
  if (!first || samples.some((sample) => !sample.orientation)) return { position };
  const orientation = scale(
    sum(({ orientation }) => orientation!.map((angle, i) => unwrap(angle, first[i])) as Vector),
    1 / samples.length,
  );
  return { position, orientation };
}

// The screen's right and down directions in the tracker's coordinates. The tracker's base sits at
// the screen, so at the centre pose the object's position points out of the screen towards the
// visitor, and right is the rest of the way the object moved between the two sides.
function screenAxes(calibration: Calibration) {
  const towardVisitor = unit(calibration.centre.position);
  const sideways = subtract(calibration.bottomRight.position, calibration.topLeft.position);
  const right = unit(subtract(sideways, scale(towardVisitor, dot(sideways, towardVisitor))));
  return { right, down: cross(right, towardVisitor) };
}

// Why a finished calibration can't be used, if it can't.
export function calibrationProblem(calibration: Calibration) {
  const { topLeft, bottomRight } = calibration;
  if (Math.hypot(...subtract(bottomRight.position, topLeft.position)) < TRACKER_DISTANCE * 0.1) {
    return 'The object hardly moved between the left and right poses. Recalibrate, holding it further out to each side.';
  }
  return null;
}

// Where the object is pointing, as a fraction of the screen: (0, 0) is the top-left corner and
// (1, 1) the bottom-right. Values past 0 or 1 are off the screen. `aspect` is the screen's height
// divided by its width.
//
// With orientation, this is laser-pointer maths: turning the object by an angle from straight
// ahead moves the spot it points at TRACKER_DISTANCE × tan(angle) across the screen. Without
// orientation, the cursor follows the object's position, like its shadow on the screen.
export function screenPoint(calibration: Calibration, sample: TrackerSample, aspect: number) {
  const { centre, topLeft, bottomRight } = calibration;
  const width = SCREEN_WIDTH;
  const height = SCREEN_WIDTH * aspect;
  if (sample.orientation && centre.orientation && topLeft.orientation && bottomRight.orientation) {
    // How far along the screen (0 to 1) angle `i` points, given the screen's size that way.
    const along = (i: number, size: number) => {
      const straight = centre.orientation![i];
      // +1 if the angle grows when pointing right (or down), -1 if it shrinks.
      const sign =
        Math.sign(unwrap(bottomRight.orientation![i], topLeft.orientation![i]) - topLeft.orientation![i]) || 1;
      const turn = clamp(sign * (unwrap(sample.orientation![i], straight) - straight), -MAX_TURN, MAX_TURN);
      return 0.5 + (TRACKER_DISTANCE * Math.tan(radians(turn))) / size;
    };
    return { x: along(0, width), y: along(1, height) };
  }

  const { right, down } = screenAxes(calibration);
  const offset = subtract(sample.position, centre.position);
  return { x: 0.5 + dot(offset, right) / width, y: 0.5 + dot(offset, down) / height };
}

// How far the object is to the right of where it was held at the centre pose, in the tracker's
// units. Negative is to the left.
export function sidewaysPosition(calibration: Calibration, position: Vector) {
  return dot(subtract(position, calibration.centre.position), screenAxes(calibration).right);
}
