# Motion tracker setup

The flip book can be driven by a handheld electromagnetic tracker (Polhemus, trakSTAR, and similar):

| Action | Gesture |
| --- | --- |
| Move the cursor | Point the object at the screen |
| Click | Hold the cursor still on a link, marker or portrait for 1 second |
| Next page | Swipe from right to left |
| Previous page | Swipe from left to right |
| Back to the map | Hold the cursor on the mini map beside the book |

## 1. Get readings into the book

Open the book in Chrome or Edge and press **T**, or click the small dot in the bottom-right corner, to open the tracker panel. The dot turns green once readings are flowing.

There are two ways to connect.

**Option A: the bridge.** This works with any tracker and any browser. Run the tracker's own program so it prints one reading per line, and pipe its output into the bridge:

```sh
<tracker program> | node tools/tracker-bridge/bridge.mjs
```

Then click **Connect** next to "Bridge" in the panel. The default address is `ws://localhost:8787`, and `--port` changes it. The bridge needs only Node, with nothing to install, and it prints how many readings per second it's forwarding.

- **Polhemus (Liberty, Patriot, Fastrak, G4):** set the output to ASCII (the `F0` command), with position plus Euler angles.
- **trakSTAR or other SDK trackers:** use or adapt the SDK's sample program so it prints each reading as a line.

**Option B: USB serial, without the bridge.** If the tracker shows up as a serial port, enter its baud rate and click **Connect** next to "USB serial". Chrome asks which port to use. This option works in Chrome and Edge only.

Either way, the book remembers the connection and reconnects by itself on the next visit.

### What a reading looks like

Each line is one of these:

```
x y z azimuth elevation roll
station x y z azimuth elevation roll
x y z
{"x": 1.2, "y": 3.4, "z": 5.6, "azimuth": 10, "elevation": -4, "roll": 0}
```

- **Angles:** in degrees.
- **Positions:** any unit, as long as `src/motion/setup.ts` uses the same one.
- **Position only:** if the tracker reports just `x y z`, the cursor follows where the object is instead of where it points.
- **Other lines:** anything else, such as headers, is ignored.

## 2. Measure the setup

The tracker's base sits at the screen. Set two numbers in `src/motion/setup.ts`, in the tracker's position units (Polhemus trackers report inches by default):

- **`TRACKER_DISTANCE`:** how far the object is from the tracker's base while a visitor uses it. The tracker panel shows the live `distance`, so hold the object where visitors will and copy that number.
- **`SCREEN_WIDTH`:** the width of the screen's picture.

These drive the movement:

- **Pointing:** it works like a laser pointer. Turning the object by an angle from straight ahead moves the cursor `TRACKER_DISTANCE × tan(angle)` across a screen that is `SCREEN_WIDTH` wide. Farther from the screen, a smaller turn crosses it.
- **Swipes:** a swipe must sweep 20° as seen from the tracker's base, which is `2 × TRACKER_DISTANCE × tan(10°)` sideways. That is about 12.7 inches at 36 inches away, so farther away, swipes must be longer.

## 3. Calibrate

Click **Calibrate** in the panel. Stand where visitors will. Each step counts down 3 seconds while you hold still:

1. Point the object at the centre of the screen.
2. Hold it out to your left, and point it at the top-left corner.
3. Hold it out to your right, and point it at the bottom-right corner.

The centre sets where "straight ahead" is. The two sides set which way is left, right, up and down, whichever way up the tracker is mounted. How far the cursor and swipes move comes from `setup.ts`, so after changing the distance there is no need to recalibrate, only to reload the page.

Recalibrate whenever the tracker, the screen or the spot visitors stand in moves. The calibration is saved in the browser.

## Tuning

The thresholds are constants at the top of the source files:

- **`src/motion/setup.ts`:** the distance and screen width above.
- **`src/motion/swipe-detector.ts`:**
  - how wide a swipe must sweep (`SWIPE_ANGLE`, in degrees as seen from the tracker's base)
  - how fast it must be (`SWIPE_TIME`)
  - how long motion is ignored after a swipe, so the hand coming back doesn't turn the page back (`COOLDOWN`)
- **`src/components/motion-control.web.tsx`:**
  - the dwell time (`DWELL_TIME`)
  - cursor smoothing (`CURSOR_SMOOTHING`)

## When the book is on GitHub Pages

The published book can still reach a bridge running on the same computer, because Chrome and Edge allow `ws://localhost` from an `https` page. Safari blocks this, so use Chrome or Edge, or run the book locally with `npx expo start`.
