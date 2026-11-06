import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { sendBookCommand, type BookCommand } from '@/motion/book-commands';
import {
  averagePose,
  CALIBRATION_STEPS,
  calibrationProblem,
  screenPoint,
  sidewaysPosition,
  type Calibration,
  type CalibrationStep,
} from '@/motion/calibration';
import { clickableAt, sendClick, sendHover } from '@/motion/dwell-click';
import { LIVE_MOTION_DEFAULT_URL } from '@/motion/live-motion';
import { SwipeDetector, type Gesture } from '@/motion/swipe-detector';
import {
  connectSerial,
  connectWebSocket,
  serialSupported,
  type ConnectionKind,
  type ConnectionStatus,
  type TrackerConnection,
} from '@/motion/tracker-connection';
import { parseTrackerLine, type TrackerSample } from '@/motion/tracker-sample';

// Lets visitors use the book with a handheld electromagnetic tracker instead of a mouse:
//
// - Point the object at the screen to move the gold ring cursor.
// - Hold the cursor over anything clickable for a second to click it.
// - Swipe right to left for the next page, left to right for the previous one.
// - Hold the cursor on the mini map beside the book to return to the map.
//
// A small button in the bottom-right corner (or the T key) opens a panel for connecting the
// tracker and calibrating it. Settings are remembered in this browser, and the book reconnects
// on its own next time. How far the tracker is from the object, and the screen's size, are set in
// src/motion/setup.ts.

// How long the cursor rests on something before it's clicked.
const DWELL_TIME = 1000;
// After a click, the cursor must move this far (px) before it can click again, so it doesn't
// click whatever lands under it when the page changes.
const REARM_DISTANCE = 30;
// Smooths out hand tremor and tracker jitter; higher is smoother but laggier (ms).
const CURSOR_SMOOTHING = 60;
// Readings older than this mean the tracker has stopped, and the cursor hides (ms).
const STALE_AFTER = 500;
// Each calibration step gives this many seconds to read the instruction and get into position,
// then counts down while the object is held still, averaging the last second of readings, then
// shows "Got it" for a moment before the next step.
const CALIBRATION_READY = 5;
const CALIBRATION_HOLD = 3;
const CALIBRATION_AVERAGE = 1000;
const CALIBRATION_DONE_PAUSE = 1500;

type CalibrationState = {
  step: number;
  phase: 'ready' | 'hold' | 'done';
  countdown: number;
  error?: string;
};

const DEFAULT_BRIDGE_URL = 'ws://localhost:8787';

// What to check when a connection is open but no readings arrive.
const NO_READINGS_HINTS: Record<ConnectionKind, string> = {
  livemotion: 'Connected, but no readings: is the LiveMotion server tracking a prop?',
  websocket:
    "Connected, but no readings: is the tracker's program piped into the bridge, and is it printing readings?",
  serial: 'Connected, but no readings: check the baud rate, and that the tracker is set to send ASCII readings.',
};
const DEFAULT_BAUD_RATE = 115200;
const STORAGE_KEY = 'motion-tracker';

const COMMANDS: Record<Gesture, { command: BookCommand; label: string }> = {
  'right-to-left': { command: 'next', label: 'Next page' },
  'left-to-right': { command: 'previous', label: 'Previous page' },
};

type Settings = {
  liveMotionUrl: string;
  bridgeUrl: string;
  baudRate: number;
  // How the tracker was last connected, to reconnect the same way on the next visit.
  lastConnection?: ConnectionKind;
  calibration?: Calibration;
};

function loadSettings(): Settings {
  const defaults: Settings = {
    liveMotionUrl: LIVE_MOTION_DEFAULT_URL,
    bridgeUrl: DEFAULT_BRIDGE_URL,
    baudRate: DEFAULT_BAUD_RATE,
  };
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const settings: Settings = saved ? { ...defaults, ...(JSON.parse(saved) as Partial<Settings>) } : defaults;
    // Calibrations from before the centre pose was added, or from before pointing used the whole
    // rotation (they saved angles instead), don't work any more.
    const centre = settings.calibration?.centre as (Record<string, unknown> & { rotation?: unknown }) | undefined;
    if (settings.calibration && (!centre || ('orientation' in centre && !centre.rotation))) delete settings.calibration;
    return settings;
  } catch {
    // Pre-rendering on the server, or storage is blocked.
    return defaults;
  }
}

function saveSettings(settings: Settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage is blocked; settings just won't be remembered.
  }
}

const STEP_INSTRUCTIONS: Record<CalibrationStep, { pointing: string; positionOnly: string }> = {
  centre: {
    pointing: 'Stand where visitors will stand. Point the object at the glowing circle in the middle.',
    positionOnly: 'Stand where visitors will stand. Hold the object in front of you.',
  },
  topLeft: {
    pointing: 'Hold the object out to your left. Point it at the glowing circle in the top-left corner.',
    positionOnly: 'Hold the object out to your left, where a swipe would start.',
  },
  bottomRight: {
    pointing: 'Hold the object out to your right. Point it at the glowing circle in the bottom-right corner.',
    positionOnly: 'Hold the object out to your right, where a swipe would end.',
  },
};

export function MotionControl() {
  const [settings, setSettings] = useState(loadSettings);
  const [status, setStatus] = useState<ConnectionStatus>({ state: 'disconnected' });
  const [panelOpen, setPanelOpen] = useState(false);
  const [calibrating, setCalibrating] = useState<CalibrationState | null>(
    null,
  );
  const [readout, setReadout] = useState<{ rate: number; sample: TrackerSample | null }>({
    rate: 0,
    sample: null,
  });
  const [gestureLabel, setGestureLabel] = useState<{ text: string; key: number } | null>(null);

  const connection = useRef<TrackerConnection | null>(null);
  const latest = useRef<TrackerSample | null>(null);
  const recent = useRef<TrackerSample[]>([]);
  const sampleCount = useRef(0);
  const calibration = useRef<Calibration | undefined>(settings.calibration);
  const isCalibrating = useRef(false);
  const draft = useRef<Partial<Calibration>>({});
  const cursor = useRef({ x: 0, y: 0, time: 0, shown: false });
  const dwell = useRef<{ element: HTMLElement | null; since: number; armedFrom: { x: number; y: number } | null }>({
    element: null,
    since: 0,
    armedFrom: null,
  });
  const cursorElement = useRef<HTMLDivElement>(null);
  const progressElement = useRef<SVGCircleElement>(null);
  const detector = useRef<SwipeDetector | null>(null);

  const updateSettings = (change: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...change };
      saveSettings(next);
      return next;
    });
  };

  useEffect(() => {
    calibration.current = settings.calibration;
    detector.current?.reset();
  }, [settings.calibration]);

  useEffect(() => {
    isCalibrating.current = calibrating !== null;
  }, [calibrating]);

  // Swipes turn the pages, with a short label so visitors can tell the gesture worked.
  useEffect(() => {
    let labelKey = 0;
    detector.current = new SwipeDetector((gesture) => {
      const { command, label } = COMMANDS[gesture];
      sendBookCommand(command);
      setGestureLabel({ text: label, key: ++labelKey });
      // Don't click whatever the cursor passed over mid-swipe.
      dwell.current.since = performance.now();
    });
    return () => detector.current?.reset();
  }, []);

  useEffect(() => {
    if (!gestureLabel) return;
    const timer = setTimeout(() => setGestureLabel(null), 900);
    return () => clearTimeout(timer);
  }, [gestureLabel]);

  const onLine = (line: string) => {
    const sample = parseTrackerLine(line, performance.now());
    if (!sample) return;
    latest.current = sample;
    sampleCount.current += 1;
    recent.current.push(sample);
    while (recent.current.length > 0 && sample.time - recent.current[0].time > 1000) recent.current.shift();
    if (calibration.current && !isCalibrating.current) {
      detector.current?.add(sidewaysPosition(calibration.current, sample.position), sample.time);
    }
  };

  const disconnect = () => {
    connection.current?.close();
    connection.current = null;
  };

  const connectBridge = (url: string) => {
    disconnect();
    connection.current = connectWebSocket(url, { onLine, onStatus: setStatus });
    updateSettings({ bridgeUrl: url, lastConnection: 'websocket' });
  };

  const connectLiveMotion = (url: string) => {
    disconnect();
    connection.current = connectWebSocket(url, { onLine, onStatus: setStatus }, 'livemotion');
    updateSettings({ liveMotionUrl: url, lastConnection: 'livemotion' });
  };

  const connectSerialPort = async (baudRate: number, pickPort: boolean) => {
    disconnect();
    const opened = await connectSerial(baudRate, pickPort, { onLine, onStatus: setStatus });
    if (!opened) return;
    connection.current = opened;
    updateSettings({ baudRate, lastConnection: 'serial' });
  };

  // Reconnect the way the tracker was connected last time.
  useEffect(() => {
    const saved = loadSettings();
    if (saved.lastConnection === 'livemotion') {
      connection.current = connectWebSocket(saved.liveMotionUrl, { onLine, onStatus: setStatus }, 'livemotion');
    } else if (saved.lastConnection === 'websocket') {
      connection.current = connectWebSocket(saved.bridgeUrl, { onLine, onStatus: setStatus });
    } else if (saved.lastConnection === 'serial') {
      connectSerial(saved.baudRate, false, { onLine, onStatus: setStatus }).then((opened) => {
        connection.current = opened;
      });
    }
    return () => connection.current?.close();
  }, []);

  // Each frame, move the cursor to where the object points and run the dwell click.
  useEffect(() => {
    let frame = 0;

    const leave = (x: number, y: number) => {
      const d = dwell.current;
      if (d.element) sendHover(d.element, false, x, y);
      d.element = null;
    };

    // Returns how far through the dwell the cursor is, from 0 to 1.
    const updateDwell = (x: number, y: number, now: number) => {
      const d = dwell.current;
      if (d.armedFrom) {
        if (Math.hypot(x - d.armedFrom.x, y - d.armedFrom.y) < REARM_DISTANCE) return 0;
        d.armedFrom = null;
        d.since = now;
      }
      const target = clickableAt(x, y);
      if (target !== d.element) {
        leave(x, y);
        if (target) sendHover(target, true, x, y);
        d.element = target;
        d.since = now;
      }
      if (!target) return 0;
      const progress = (now - d.since) / DWELL_TIME;
      if (progress < 1) return Math.max(0, progress);
      sendClick(target, x, y);
      d.armedFrom = { x, y };
      return 0;
    };

    const setProgress = (progress: number) => {
      const circle = progressElement.current;
      if (circle) circle.style.strokeDashoffset = String(PROGRESS_LENGTH * (1 - progress));
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const sample = latest.current;
      const element = cursorElement.current;
      const calibrated = calibration.current;
      if (!element) return;
      if (!sample || !calibrated || isCalibrating.current || now - sample.time > STALE_AFTER) {
        if (cursor.current.shown) {
          element.style.display = 'none';
          cursor.current.shown = false;
          leave(cursor.current.x, cursor.current.y);
        }
        return;
      }

      const point = screenPoint(calibrated, sample, window.innerHeight / window.innerWidth);
      // Pointing away from the screen: the cursor waits where it is.
      if (!point) return;
      const targetX = clamp(point.x, 0, 1) * window.innerWidth;
      const targetY = clamp(point.y, 0, 1) * window.innerHeight;
      const c = cursor.current;
      if (!c.shown) {
        c.x = targetX;
        c.y = targetY;
        element.style.display = 'block';
        c.shown = true;
      } else {
        const follow = 1 - Math.exp(-(now - c.time) / CURSOR_SMOOTHING);
        c.x += (targetX - c.x) * follow;
        c.y += (targetY - c.y) * follow;
      }
      c.time = now;
      element.style.transform = `translate(${c.x}px, ${c.y}px)`;
      setProgress(updateDwell(c.x, c.y, now));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Calibration: for each pose, time to get ready, then a countdown holding still, then the last
  // second of readings is averaged, and "Got it" shows before the next step.
  useEffect(() => {
    if (!calibrating || calibrating.error) return;
    if (calibrating.phase === 'done') {
      const timer = setTimeout(() => {
        const next = calibrating.step + 1;
        if (next < CALIBRATION_STEPS.length) {
          setCalibrating({ step: next, phase: 'ready', countdown: CALIBRATION_READY });
          return;
        }
        const finished = draft.current as Calibration;
        const problem = calibrationProblem(finished);
        if (problem) {
          setCalibrating({ ...calibrating, error: problem });
          return;
        }
        updateSettings({ calibration: finished });
        setCalibrating(null);
      }, CALIBRATION_DONE_PAUSE);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      if (calibrating.countdown > 1) {
        setCalibrating({ ...calibrating, countdown: calibrating.countdown - 1 });
        return;
      }
      if (calibrating.phase === 'ready') {
        setCalibrating({ ...calibrating, phase: 'hold', countdown: CALIBRATION_HOLD });
        return;
      }
      const now = performance.now();
      const pose = averagePose(recent.current.filter((sample) => now - sample.time <= CALIBRATION_AVERAGE));
      if (!pose) {
        setCalibrating({ ...calibrating, error: 'No readings from the tracker. Is it connected?' });
        return;
      }
      draft.current[CALIBRATION_STEPS[calibrating.step]] = pose;
      setCalibrating({ ...calibrating, phase: 'done' });
    }, 1000);
    return () => clearTimeout(timer);
  }, [calibrating]);

  const startCalibration = () => {
    draft.current = {};
    setPanelOpen(false);
    setCalibrating({ step: 0, phase: 'ready', countdown: CALIBRATION_READY });
  };

  // T opens and closes the panel; Escape closes it or stops calibrating.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.matches?.('input, textarea')) return;
      if (event.key === 't' || event.key === 'T') setPanelOpen((open) => !open);
      else if (event.key === 'Escape') {
        setPanelOpen(false);
        setCalibrating(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // While the panel is open, show live readings once a second.
  useEffect(() => {
    if (!panelOpen) return;
    sampleCount.current = 0;
    const timer = setInterval(() => {
      setReadout({ rate: sampleCount.current, sample: latest.current });
      sampleCount.current = 0;
    }, 1000);
    return () => clearInterval(timer);
  }, [panelOpen]);

  const hasOrientation = readout.sample ? readout.sample.orientation !== undefined : true;
  const step = calibrating ? CALIBRATION_STEPS[calibrating.step] : null;

  return (
    <>
      <div ref={cursorElement} style={styles.cursor} aria-hidden>
        <svg width={CURSOR_SIZE} height={CURSOR_SIZE} viewBox="-30 -30 60 60" style={{ display: 'block' }}>
          <circle r={PROGRESS_RADIUS} fill="none" stroke="rgba(59, 42, 26, 0.35)" strokeWidth={5} />
          <circle
            ref={progressElement}
            r={PROGRESS_RADIUS}
            fill="none"
            stroke={GOLD}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={PROGRESS_LENGTH}
            strokeDashoffset={PROGRESS_LENGTH}
            transform="rotate(-90)"
          />
          <circle r={11} fill="none" stroke="rgba(59, 42, 26, 0.6)" strokeWidth={6} />
          <circle r={11} fill="none" stroke={GOLD} strokeWidth={3} />
        </svg>
      </div>

      {gestureLabel && (
        <div key={gestureLabel.key} style={styles.gestureLabel}>
          {gestureLabel.text}
        </div>
      )}

      {calibrating && step && (
        // The card moves down out of the way while the target is in the centre.
        <div style={{ ...styles.calibrationOverlay, ...(step === 'centre' && styles.calibrationOverlayLow) }}>
          {step === 'centre' && <div style={{ ...styles.cornerTarget, top: '50%', left: '50%' }} />}
          {step === 'topLeft' && <div style={{ ...styles.cornerTarget, top: 0, left: 0 }} />}
          {step === 'bottomRight' && <div style={{ ...styles.cornerTarget, bottom: 0, right: 0 }} />}
          <div style={styles.calibrationCard}>
            {/* One dot per step: filled once done, outlined for the current one. */}
            <div style={styles.stepDots}>
              {CALIBRATION_STEPS.map((name, index) => (
                <span
                  key={name}
                  style={{
                    ...styles.stepDot,
                    ...(index < calibrating.step || (index === calibrating.step && calibrating.phase === 'done')
                      ? styles.stepDotDone
                      : index === calibrating.step
                        ? styles.stepDotCurrent
                        : {}),
                  }}
                />
              ))}
            </div>
            <div style={styles.calibrationStep}>
              Step {calibrating.step + 1} of {CALIBRATION_STEPS.length}
            </div>
            <div style={styles.calibrationText}>
              {hasOrientation ? STEP_INSTRUCTIONS[step].pointing : STEP_INSTRUCTIONS[step].positionOnly}
            </div>
            {calibrating.error ? (
              <>
                <div style={styles.error}>{calibrating.error}</div>
                <div style={styles.buttonRow}>
                  <button style={styles.button} onClick={startCalibration}>
                    Try again
                  </button>
                  <button style={styles.button} onClick={() => setCalibrating(null)}>
                    Close
                  </button>
                </div>
              </>
            ) : calibrating.phase === 'done' ? (
              <div style={styles.gotIt}>✓ Got it</div>
            ) : (
              <>
                <div style={calibrating.phase === 'hold' ? styles.phaseHold : styles.phaseReady}>
                  {calibrating.phase === 'hold' ? 'Hold still' : 'Get ready'}
                </div>
                <div style={styles.countdown}>{calibrating.countdown}</div>
                <div style={styles.hint}>Press Esc to cancel.</div>
              </>
            )}
          </div>
        </div>
      )}

      <button
        style={styles.toggle}
        onClick={() => setPanelOpen((open) => !open)}
        title="Motion tracker (T)"
        aria-label="Motion tracker settings">
        <span style={{ ...styles.statusDot, backgroundColor: statusColor(status) }} />
      </button>

      {panelOpen && (
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Motion tracker</div>
          <div style={styles.statusLine}>{describeStatus(status)}</div>

          <label style={styles.label}>LiveMotion server</label>
          <div style={styles.row}>
            <input
              style={styles.input}
              value={settings.liveMotionUrl}
              onChange={(event) => updateSettings({ liveMotionUrl: event.target.value })}
            />
            <button style={styles.button} onClick={() => connectLiveMotion(settings.liveMotionUrl)}>
              Connect
            </button>
          </div>

          <label style={styles.label}>Bridge (WebSocket)</label>
          <div style={styles.row}>
            <input
              style={styles.input}
              value={settings.bridgeUrl}
              onChange={(event) => updateSettings({ bridgeUrl: event.target.value })}
            />
            <button style={styles.button} onClick={() => connectBridge(settings.bridgeUrl)}>
              Connect
            </button>
          </div>

          {serialSupported() && (
            <>
              <label style={styles.label}>USB serial (baud rate)</label>
              <div style={styles.row}>
                <input
                  style={styles.input}
                  inputMode="numeric"
                  value={String(settings.baudRate)}
                  onChange={(event) => updateSettings({ baudRate: Number(event.target.value) || 0 })}
                />
                <button style={styles.button} onClick={() => connectSerialPort(settings.baudRate, true)}>
                  Connect
                </button>
              </div>
            </>
          )}

          <div style={styles.row}>
            <button
              style={styles.button}
              onClick={() => {
                disconnect();
                updateSettings({ lastConnection: undefined });
              }}>
              Disconnect
            </button>
            <button style={styles.button} onClick={startCalibration}>
              {settings.calibration ? 'Recalibrate' : 'Calibrate'}
            </button>
          </div>

          <div style={styles.readout}>
            {settings.calibration ? 'Calibrated.' : 'Not calibrated yet: calibrate before use.'}
            <br />
            {readout.rate} readings/s
            {status.state === 'connected' && readout.rate === 0 && (
              <>
                <br />
                {NO_READINGS_HINTS[status.kind]}
              </>
            )}
            {readout.sample && (
              <>
                <br />
                position {readout.sample.position.map(format).join(', ')}
                <br />
                distance {format(Math.hypot(...readout.sample.position))}
                {readout.sample.objectCount !== undefined && (
                  <>
                    <br />
                    {readout.sample.objectCount === 1
                      ? 'tracking 1 object'
                      : `tracking ${readout.sample.objectCount} objects: the book follows the first, so the cursor may jump`}
                  </>
                )}
                {readout.sample.orientation && (
                  <>
                    <br />
                    angles {readout.sample.orientation.map(format).join(', ')}
                  </>
                )}
              </>
            )}
          </div>

          <div style={styles.hint}>
            Point to move the cursor and hold still for a second to click. Swipe right to left for the
            next page, and left to right for the previous one.
          </div>
        </div>
      )}
    </>
  );
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const format = (value: number) => value.toFixed(1);

function statusColor(status: ConnectionStatus) {
  if (status.state === 'connected') return '#6fbf5a';
  if (status.state === 'disconnected') return '#8a7a66';
  return '#e0a83a';
}

function describeStatus(status: ConnectionStatus) {
  const via = (kind: ConnectionKind) =>
    ({ livemotion: 'the LiveMotion server', websocket: 'the bridge', serial: 'USB serial' })[kind];
  switch (status.state) {
    case 'disconnected':
      return 'Not connected.';
    case 'connecting':
      return `Connecting through ${via(status.kind)}…`;
    case 'connected':
      return `Connected through ${via(status.kind)}.`;
    case 'error':
      return status.message;
  }
}

const GOLD = '#e8c877';
const INK = '#3b2a1a';
const PARCHMENT = '#f3e7c9';
const CURSOR_SIZE = 60;
const PROGRESS_RADIUS = 21;
const PROGRESS_LENGTH = 2 * Math.PI * PROGRESS_RADIUS;
const FONT = "Cinzel, Georgia, 'Times New Roman', serif";

const styles: Record<string, CSSProperties> = {
  cursor: {
    display: 'none',
    position: 'fixed',
    left: -CURSOR_SIZE / 2,
    top: -CURSOR_SIZE / 2,
    zIndex: 10000,
    pointerEvents: 'none',
    filter: 'drop-shadow(0 0 4px rgba(240, 215, 140, 0.6))',
  },
  gestureLabel: {
    position: 'fixed',
    left: '50%',
    bottom: 48,
    transform: 'translateX(-50%)',
    zIndex: 10000,
    pointerEvents: 'none',
    padding: '8px 18px',
    borderRadius: 20,
    backgroundColor: 'rgba(30, 20, 12, 0.8)',
    color: GOLD,
    fontFamily: FONT,
    fontSize: 18,
  },
  calibrationOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 10, 6, 0.7)',
  },
  calibrationOverlayLow: { alignItems: 'flex-end', paddingBottom: 40 },
  cornerTarget: {
    position: 'fixed',
    width: 70,
    height: 70,
    borderRadius: '50%',
    backgroundColor: GOLD,
    boxShadow: `0 0 30px ${GOLD}`,
    // Centred on the very corner of the screen.
    margin: -35,
  },
  calibrationCard: {
    maxWidth: 460,
    padding: 32,
    borderRadius: 12,
    backgroundColor: PARCHMENT,
    color: INK,
    fontFamily: FONT,
    textAlign: 'center',
  },
  calibrationStep: { fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.7 },
  calibrationText: { fontSize: 24, marginTop: 10, lineHeight: 1.35 },
  stepDots: { display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12 },
  stepDot: { width: 14, height: 14, borderRadius: 7, border: `2px solid ${INK}`, opacity: 0.35 },
  stepDotCurrent: { opacity: 1 },
  stepDotDone: { opacity: 1, backgroundColor: INK },
  phaseReady: { fontSize: 16, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 18, opacity: 0.7 },
  phaseHold: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 18,
    color: '#7a1a17',
  },
  countdown: { fontSize: 64, fontWeight: 700, lineHeight: 1.1 },
  gotIt: { fontSize: 32, fontWeight: 700, marginTop: 22, marginBottom: 8, color: '#2f6b2f' },
  buttonRow: { display: 'flex', justifyContent: 'center', gap: 10 },
  error: { color: '#7a1a17', marginTop: 14, marginBottom: 12 },
  toggle: {
    position: 'fixed',
    right: 10,
    bottom: 10,
    zIndex: 9998,
    width: 26,
    height: 26,
    padding: 0,
    borderRadius: 13,
    border: '1px solid rgba(232, 200, 119, 0.4)',
    backgroundColor: 'rgba(30, 20, 12, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  panel: {
    position: 'fixed',
    right: 10,
    bottom: 44,
    zIndex: 9998,
    width: 320,
    maxWidth: 'calc(100vw - 20px)',
    padding: 16,
    borderRadius: 10,
    border: '1px solid #8a6a3a',
    backgroundColor: PARCHMENT,
    color: INK,
    fontFamily: FONT,
    fontSize: 14,
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.5)',
  },
  panelTitle: { fontSize: 18, fontWeight: 700 },
  statusLine: { marginTop: 4, marginBottom: 6 },
  label: { display: 'block', marginTop: 10, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7 },
  row: { display: 'flex', gap: 8, marginTop: 6 },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '6px 8px',
    border: '1px solid #8a6a3a',
    borderRadius: 6,
    backgroundColor: '#fbf6ea',
    color: INK,
    fontFamily: 'ui-monospace, Menlo, monospace',
    fontSize: 13,
  },
  button: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: 6,
    backgroundColor: '#5a1512',
    color: '#f3e7c9',
    fontFamily: FONT,
    fontSize: 14,
  },
  readout: { marginTop: 12, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, lineHeight: 1.5 },
  hint: { marginTop: 10, fontSize: 12, lineHeight: 1.4, opacity: 0.75 },
};
