export type Gesture = 'left-to-right' | 'right-to-left';

// A swipe sweeps across at least this angle as seen from the tracker's base (degrees)...
const SWIPE_ANGLE = 20;
// ...which means moving the object sideways by this fraction of how far away the visitor stands
// (about 0.35: roughly 12.7 inches at 3 feet)...
const SWIPE_LENGTH = 2 * Math.tan((SWIPE_ANGLE * Math.PI) / 360);
// ...within this many milliseconds, so slowly moving the object to aim doesn't count.
const SWIPE_TIME = 450;
// After a swipe, motion is ignored for this long (ms). This covers the rest of the swipe and the
// hand coming back to where it started, which would otherwise read as a swipe the other way.
const COOLDOWN = 700;

// Watches the object's side-to-side position and reports swipes.
export class SwipeDetector {
  private history: { position: number; time: number }[] = [];
  private cooldownUntil = 0;

  constructor(private onGesture: (gesture: Gesture) => void) {}

  // `position` is from sidewaysPosition(): how far right the object is, as a fraction of how far
  // away the visitor stands.
  add(position: number, time: number) {
    if (time < this.cooldownUntil) {
      this.history = [];
      return;
    }
    this.history.push({ position, time });
    while (this.history.length > 0 && time - this.history[0].time > SWIPE_TIME) this.history.shift();

    for (const earlier of this.history) {
      const moved = position - earlier.position;
      if (Math.abs(moved) >= SWIPE_LENGTH) {
        this.history = [];
        this.cooldownUntil = time + COOLDOWN;
        this.onGesture(moved > 0 ? 'left-to-right' : 'right-to-left');
        return;
      }
    }
  }

  // Forgets motion so far, e.g. while calibrating.
  reset() {
    this.history = [];
    this.cooldownUntil = 0;
  }
}
