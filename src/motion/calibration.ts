import { type TrackerSample, type Vector } from '@/motion/tracker-sample';

// A held-still reading, averaged over a moment to smooth out jitter.
export type Pose = { position: Vector; orientation?: Vector };

// Four poses taken during calibration: pointing at two opposite corners of the screen, and
// holding the object out at each end of a swipe.
export type Calibration = {
  topLeft: Pose;
  bottomRight: Pose;
  left: Vector;
  right: Vector;
};

export type CalibrationStep = keyof Calibration;
export const CALIBRATION_STEPS: CalibrationStep[] = ['topLeft', 'bottomRight', 'left', 'right'];

const subtract = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vector, k: number): Vector => [a[0] * k, a[1] * k, a[2] * k];

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

// Where the object is pointing, as a fraction of the screen: (0, 0) is the top-left corner and
// (1, 1) the bottom-right. Values past 0 or 1 are off the screen.
//
// With orientation, the cursor follows where the object points, scaled between the angles it
// had at the two corners. Without it, the cursor follows the object's position between the
// spots it was held at for the two corners.
export function screenPoint(calibration: Calibration, sample: TrackerSample) {
  const { topLeft, bottomRight } = calibration;
  if (sample.orientation && topLeft.orientation && bottomRight.orientation) {
    const fraction = (i: number) => {
      const start = topLeft.orientation![i];
      const end = unwrap(bottomRight.orientation![i], start);
      return (unwrap(sample.orientation![i], start) - start) / (end - start || 1);
    };
    return { x: fraction(0), y: fraction(1) };
  }

  // Across follows the swipe direction; down is the rest of the corner-to-corner direction.
  const across = subtract(calibration.right, calibration.left);
  const diagonal = subtract(bottomRight.position, topLeft.position);
  const down = subtract(diagonal, scale(across, dot(diagonal, across) / (dot(across, across) || 1)));
  const offset = subtract(sample.position, topLeft.position);
  return {
    x: dot(offset, across) / (dot(diagonal, across) || 1),
    y: dot(offset, down) / (dot(diagonal, down) || 1),
  };
}

// How far along the swipe the object is: 0 where it was held on the left, 1 on the right.
export function swipePosition(calibration: Calibration, position: Vector) {
  const across = subtract(calibration.right, calibration.left);
  return dot(subtract(position, calibration.left), across) / (dot(across, across) || 1);
}
