// The exhibit's physical setup. Measure both in the units the tracker reports positions in
// (Polhemus trackers report inches unless switched to centimetres). The tracker panel (T) shows
// the measured distance live, which helps when setting TRACKER_DISTANCE.

// How far the object is from the tracker's base while a visitor uses it. The base sits at the
// screen, so this is also how far the object is from the screen. Farther away, a smaller turn
// moves the cursor across the screen, and a swipe has to be longer.
export const TRACKER_DISTANCE = 36;

// The width of the screen's picture. Its height comes from the browser window's shape.
export const SCREEN_WIDTH = 48;
