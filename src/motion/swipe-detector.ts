export type Gesture = 'left-to-right' | 'right-to-left';

// A swipe covers at least this much of the calibrated left-to-right distance...
const SWIPE_DISTANCE = 0.5;
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

  // `position` is from swipePosition(): 0 at the left end of a swipe, 1 at the right.
  add(position: number, time: number) {
    if (time < this.cooldownUntil) {
      this.history = [];
      return;
    }
    this.history.push({ position, time });
    while (this.history.length > 0 && time - this.history[0].time > SWIPE_TIME) this.history.shift();

    for (const earlier of this.history) {
      const moved = position - earlier.position;
      if (Math.abs(moved) >= SWIPE_DISTANCE) {
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
