import { type Vector } from '@/motion/rotation';

// Which way is up, in the tracker's own coordinates (the x, y, z that the tracker panel's
// `position` line shows). Check it by raising the object and watching which number grows.
//
// For the exhibit's tracker, +z goes up from the ground.
export const UP: Vector = [0, 0, 1];

// How far the screen is from the tracker's base, on the far side from where visitors stand, in
// the tracker's units. The exhibit's LiveMotion server reports centimetres, and the screen is
// about 6½ feet from the base: 198 cm. (Visitors stand about 2½ feet on the other side of it.)
//
// This only needs to be roughly right. Calibration's corner steps fit the cursor to the screen
// either way; the distance makes the cursor follow correctly when a visitor steps sideways.
export const SCREEN_DISTANCE = 198;

// Everything else is worked out while calibrating:
// - which axis runs from the screen, through the base, toward visitors (the one the visitor
//   stands along when pointing at the centre; for the exhibit's LiveMotion server that's +y),
// - which way is the visitor's right (the way the object moves from the left pose to the right
//   one),
// - how far away visitors stand, where the screen's corners are, and how the sensor sits inside
//   the object.
