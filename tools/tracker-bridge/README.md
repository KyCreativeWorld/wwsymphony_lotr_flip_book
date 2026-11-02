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
- **Positions:** any unit.
- **Position only:** if the tracker reports just `x y z`, the cursor follows where the object is instead of where it points.
- **Other lines:** anything else, such as headers, is ignored.

## 2. Calibrate

Click **Calibrate** in the panel. Each step counts down 3 seconds while you hold still:

1. Point the object at the top-left corner of the screen.
2. Point it at the bottom-right corner.
3. Hold it out to your left, where a swipe would start.
4. Hold it out to your right, where a swipe would end.

Recalibrate whenever the tracker, the screen or the spot visitors stand in moves. The calibration is saved in the browser.

## Tuning

The thresholds are constants at the top of the source files:

- **`src/motion/swipe-detector.ts`:**
  - how far a swipe must go (`SWIPE_DISTANCE`, as a share of the calibrated left-to-right distance)
  - how fast it must be (`SWIPE_TIME`)
  - how long motion is ignored after a swipe, so the hand coming back doesn't turn the page back (`COOLDOWN`)
- **`src/components/motion-control.web.tsx`:**
  - the dwell time (`DWELL_TIME`)
  - cursor smoothing (`CURSOR_SMOOTHING`)

## When the book is on GitHub Pages

The published book can still reach a bridge running on the same computer, because Chrome and Edge allow `ws://localhost` from an `https` page. Safari blocks this, so use Chrome or Edge, or run the book locally with `npx expo start`.
