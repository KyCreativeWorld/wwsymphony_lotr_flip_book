import { type Vector } from '@/motion/rotation';

// How the tracker's axes lie in the room, as seen by a visitor standing in front of the screen.
// Each is a direction in the tracker's own coordinates (the x, y, z that the tracker panel's
// `position` line shows). Check them by moving the object and watching that line.
//
// The exhibit's tracker: +x runs from the tracker toward the visitor, +y goes to the visitor's
// left, and +z goes up from the ground.

// Out of the screen, toward the visitor.
export const TOWARD_VISITOR: Vector = [1, 0, 0];
// Up.
export const UP: Vector = [0, 0, 1];
// The visitor's right, facing the screen. Calibration double-checks this one: if the left and
// right poses come out the other way round, it follows the poses.
export const VISITOR_RIGHT: Vector = [0, -1, 0];

// Everything else is measured while calibrating: how far away visitors stand, where the screen's
// corners are, and how the sensor sits inside the object. So there are no distances to set here,
// and the units the tracker reports (inches, centimetres, metres) don't matter.
