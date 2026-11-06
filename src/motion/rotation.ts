// Small 3D maths for the tracker: vectors, and rotations as 3×3 matrices.
//
// A rotation matrix turns directions in the sensor's own frame into the tracker's frame. Working
// with whole rotations, rather than azimuth, elevation and roll one at a time, avoids the jumps
// those angles make (azimuth leaps from +180 to −180, and near straight up or down the angles
// swing wildly), and it doesn't matter which way round the sensor sits inside the object.

export type Vector = [number, number, number];
// Three rows.
export type Matrix = [Vector, Vector, Vector];

export const add = (a: Vector, b: Vector): Vector => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const subtract = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vector, k: number): Vector => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vector, b: Vector): Vector => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vector) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: Vector) => scale(a, 1 / (length(a) || 1));

// M × v.
export const rotate = (m: Matrix, v: Vector): Vector => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
// Mᵀ × v: the opposite rotation.
export const unrotate = (m: Matrix, v: Vector): Vector => [
  m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
  m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
  m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
];

const radians = (degrees: number) => (degrees * Math.PI) / 180;

// From azimuth, elevation and roll in degrees, the order Polhemus trackers use: turn about z by
// azimuth, then about y by elevation, then about x by roll.
export function eulerMatrix([azimuth, elevation, roll]: Vector): Matrix {
  const [ca, sa] = [Math.cos(radians(azimuth)), Math.sin(radians(azimuth))];
  const [ce, se] = [Math.cos(radians(elevation)), Math.sin(radians(elevation))];
  const [cr, sr] = [Math.cos(radians(roll)), Math.sin(radians(roll))];
  return [
    [ca * ce, ca * se * sr - sa * cr, ca * se * cr + sa * sr],
    [sa * ce, sa * se * sr + ca * cr, sa * se * cr - ca * sr],
    [-se, ce * sr, ce * cr],
  ];
}

// From a rotation quaternion.
export function quaternionMatrix({ x, y, z, w }: { x: number; y: number; z: number; w: number }): Matrix {
  const n = Math.hypot(x, y, z, w) || 1;
  [x, y, z, w] = [x / n, y / n, z / n, w / n];
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
}

// The average of several rotations that are close together: the matrices are averaged, then
// straightened back into a proper rotation.
export function averageRotation(rotations: Matrix[]): Matrix {
  const sum = rotations.reduce<Matrix>(
    (total, m) => [add(total[0], m[0]), add(total[1], m[1]), add(total[2], m[2])],
    [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  );
  // Columns of the averaged matrix, made unit length and square to each other.
  const column = (i: number): Vector => [sum[0][i], sum[1][i], sum[2][i]];
  const first = unit(column(0));
  const second = unit(subtract(column(1), scale(first, dot(column(1), first))));
  const third = cross(first, second);
  return [
    [first[0], second[0], third[0]],
    [first[1], second[1], third[1]],
    [first[2], second[2], third[2]],
  ];
}
