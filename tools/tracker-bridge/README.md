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

There are three ways to connect.

**The LiveMotion server.** If the class's LiveMotion motion server is tracking the object, click **Connect** next to "LiveMotion server" in the panel. The default address is `ws://localhost:8080`. No bridge is needed. The book follows the first tracked prop: its `pos` gives the position, and its rotation (a quaternion `{x, y, z, w}`, or `azimuth`/`elevation`/`roll` angles) gives where it points.

To check the server on its own, open `motioncapture/motioncapture.html` in a browser. It shows the connection, the readings per second, and the latest prop exactly as the server sends it. If the panel shows a position but no `angles`, the server's rotation field has a name the book doesn't recognise yet. In that case, send a copy of what the test page shows.

LiveMotion may use different units from the tracker's own software, for example metres instead of inches. Set `TRACKER_DISTANCE` and `SCREEN_WIDTH` in `src/motion/setup.ts` in the same units the panel's `position` shows.

**Option A: the bridge.** This works with any tracker and any browser. Run the tracker's own program so it prints one reading per line, and pipe its output into the bridge:

```sh
<tracker program> | node tools/tracker-bridge/bridge.mjs
```

Then click **Connect** next to "Bridge" in the panel. The default address is `ws://localhost:8787`, and `--port` changes it. The bridge needs only Node, with nothing to install, and it prints how many readings per second it's forwarding.

- **Polhemus G4:** see [Polhemus G4 on Windows](#polhemus-g4-on-windows) below. The bridge reads PiMgr's live export directly, so there's no program to pipe in.
- **Polhemus (Liberty, Patriot, Fastrak):** set the output to ASCII (the `F0` command), with position plus Euler angles.
- **trakSTAR or other SDK trackers:** use or adapt the SDK's sample program so it prints each reading as a line.

**Option B: USB serial, without the bridge.** If the tracker shows up as a serial port, enter its baud rate and click **Connect** next to "USB serial". Chrome asks which port to use. This option works in Chrome and Edge only.

Either way, the book remembers the connection and reconnects by itself on the next visit.

### Polhemus G4 on Windows

The G4 talks to Windows through its wireless USB module and Polhemus's software, so it never appears as a serial port. Instead, PiMgr exports live readings into a Windows named pipe, and the bridge reads that pipe. Run everything on the Windows computer the G4 is plugged into: PiMgr, the bridge, and the book in Chrome.

**One-time setup:**

1. Install Node.js (the LTS version) from [nodejs.org](https://nodejs.org).
2. Copy `tools/tracker-bridge/bridge.mjs` onto the Windows computer. It's the only file needed. You can download it from the project's GitHub page, or download the whole project with **Code → Download ZIP**.

**Each time:**

1. **Start tracking in PiMgr.**
   - Launch PiMgr and wait for it to connect to the G4.
   - Apply your source configuration (`.g4c`) under **Device → Source Configuration**, if it isn't already applied.
   - Press **P**. One line of readings should appear in PiMgr's text pane.
2. **Set the output format.** In PiMgr's output settings, choose **position** and **Euler angles**, in **ASCII**, not binary. Inches is the G4's default unit, and it's what `src/motion/setup.ts` assumes.
3. **Turn on the export.** Choose **Motion → Export Realtime Motion Data**, then press **C** for continuous mode.
4. **Start the bridge.** In PowerShell, in the folder with `bridge.mjs`, run:

   ```powershell
   node bridge.mjs --pipe
   ```

   Within a few seconds it should print `Reading PiMgr's export from \\.\pipe\PDIPnOPipe`, then the first few readings (`From PiMgr: ...`).
5. **Connect the book.**
   - Open the book in Chrome on the same computer. On the GitHub Pages copy, allow **Local network access** (see [When the book is on GitHub Pages](#when-the-book-is-on-github-pages)).
   - Press **T** and click **Connect** next to "Bridge".
   - Calibrate.

**If the bridge keeps saying "Waiting for \\.\pipe\PDIPnOPipe":**
- **Export or continuous mode is off:** check that Export Realtime Motion Data is on, and that PiMgr is in continuous mode.
- **PiMgr uses a different pipe name:** if PiMgr's export dialog shows a pipe name, pass it on, as in `node bridge.mjs --pipe MyPipeName`.
- **PiMgr connects to a pipe rather than creating one:** some PiMgr versions do this. Stop the bridge and run `node bridge.mjs --pipe-server` instead. Then turn the export off and on again in PiMgr.

**If it says PiMgr "is sending binary data":** set the output format to ASCII (step 2).

The book uses the last six numbers on each line (x, y, z, azimuth, elevation, roll), so PiMgr's hub, sensor, frame and button fields in front are skipped. Use one sensor: with more than one, the readings take turns and the cursor jumps between them.

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

Click **Calibrate** in the panel. Stand where visitors will. There are three steps, and each one goes the same way: 5 seconds to **get ready** (read the instruction and get into position), then 3 seconds to **hold still**, then a moment showing **Got it** before the next step. The whole calibration takes about half a minute.

1. Point the object at the glowing circle in the middle of the screen.
2. Hold it out to your left, and point it at the glowing circle in the top-left corner.
3. Hold it out to your right, and point it at the glowing circle in the bottom-right corner.

If something goes wrong, the card says what and offers **Try again**. Press Esc to cancel at any time. To change the timings, edit `CALIBRATION_READY` and `CALIBRATION_HOLD` in `src/components/motion-control.web.tsx`.

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

The published book can still reach a bridge running on the same computer, in Chrome or Edge, once you allow it. Chrome blocks a public website from reaching programs on your own computer until you give it **Local network access**:

1. Open the book's GitHub Pages address.
2. Click the icon to the left of the address bar, then **Site settings**.
3. Set **Local network access** to **Allow**, and reload.

Chrome may instead ask with a pop-up the first time the book tries to connect; choose **Allow**. Safari blocks this entirely, so use Chrome or Edge, or run the book locally with `npx expo start`, which needs no permission.

## Troubleshooting

Open the tracker panel (**T**) and read its status:

| Panel says | Meaning |
| --- | --- |
| Can't reach the bridge | The bridge isn't running, or (on GitHub Pages) Local network access isn't allowed. Check that the bridge's terminal says `Tracker bridge listening on ws://localhost:8787`. |
| Connected, but no readings | The book reaches the bridge, but nothing is coming in. Check the bridge's terminal: `0 readings/s` means the tracker's program isn't printing readings into it. |
| Readings come in, but the cursor doesn't move | Calibrate. |

To test the bridge without the tracker, type a reading such as `1 0 0 36 0 0 0` into the bridge's terminal and press Enter. The panel's position line should change.
