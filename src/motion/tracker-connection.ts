// Gets tracker readings into the browser, one text line at a time. Three ways in:
//
// - LiveMotion: the class's motion server streams readings over a WebSocket (see
//   live-motion.ts).
// - WebSocket: a bridge program on this computer reads the tracker and forwards each reading
//   (see tools/tracker-bridge/). Works with any tracker and any browser.
// - USB serial: the browser reads a serial tracker directly through the Web Serial API
//   (Chrome and Edge only).
//
// Both hand lines to the same parser, so the rest of the app doesn't care which is used.

export type ConnectionKind = 'livemotion' | 'websocket' | 'serial';

export type ConnectionStatus =
  | { state: 'disconnected' }
  | { state: 'connecting'; kind: ConnectionKind }
  | { state: 'connected'; kind: ConnectionKind }
  | { state: 'error'; kind: ConnectionKind; message: string };

export type TrackerConnection = { close: () => void };

type Handlers = {
  onLine: (line: string) => void;
  onStatus: (status: ConnectionStatus) => void;
};

// How long to wait before trying the server again after it drops or isn't running yet.
const RECONNECT_DELAY = 2000;

// Connects to a bridge or LiveMotion server at `url`, retrying until closed, so the book picks the
// tracker back up whenever the server restarts.
export function connectWebSocket(
  url: string,
  { onLine, onStatus }: Handlers,
  kind: 'livemotion' | 'websocket' = 'websocket',
): TrackerConnection {
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  const server = kind === 'livemotion' ? 'the LiveMotion server' : 'the bridge';

  const open = () => {
    onStatus({ state: 'connecting', kind });
    try {
      socket = new WebSocket(url);
    } catch (error) {
      onStatus({ state: 'error', kind, message: String(error) });
      return;
    }
    socket.onopen = () => onStatus({ state: 'connected', kind });
    socket.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      // A message can hold one reading or several, separated by newlines.
      event.data.split(/\r?\n/).forEach(onLine);
    };
    socket.onclose = () => {
      if (closed) return;
      // The browser doesn't say why a connection failed. From a published (https) page, the usual
      // reason is that Chrome hasn't been allowed to reach this computer's local network.
      const hint =
        window.location.protocol === 'https:'
          ? ` Is ${server} running? If so, click the icon left of the address bar and allow Local network access.`
          : ` Is ${server} running?`;
      onStatus({
        state: 'error',
        kind,
        message: `Can't reach ${server} at ${url}.${hint} Retrying…`,
      });
      retry = setTimeout(open, RECONNECT_DELAY);
    };
  };
  open();

  return {
    close: () => {
      closed = true;
      clearTimeout(retry);
      socket?.close();
      onStatus({ state: 'disconnected' });
    },
  };
}

// The parts of the Web Serial API used here. TypeScript's DOM types don't include it yet.
type SerialPort = {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<BufferSource> | null;
};
type Serial = {
  requestPort: () => Promise<SerialPort>;
  getPorts: () => Promise<SerialPort[]>;
};
const serial = () =>
  (typeof navigator !== 'undefined' ? (navigator as Navigator & { serial?: Serial }).serial : undefined);

export const serialSupported = () => serial() !== undefined;

// Opens a serial tracker. With `pickPort`, the browser asks which port to use (this needs a
// click); otherwise it reopens a port the user already picked on an earlier visit, if any.
export async function connectSerial(
  baudRate: number,
  pickPort: boolean,
  { onLine, onStatus }: Handlers,
): Promise<TrackerConnection | null> {
  const api = serial();
  if (!api) return null;
  let port: SerialPort | undefined;
  try {
    port = pickPort ? await api.requestPort() : (await api.getPorts())[0];
  } catch {
    // The user closed the port picker.
    return null;
  }
  if (!port) return null;

  onStatus({ state: 'connecting', kind: 'serial' });
  let closed = false;
  let reader: ReadableStreamDefaultReader<string> | undefined;
  try {
    await port.open({ baudRate });
  } catch (error) {
    onStatus({ state: 'error', kind: 'serial', message: `Couldn't open the port: ${String(error)}` });
    return null;
  }
  onStatus({ state: 'connected', kind: 'serial' });

  const read = async () => {
    let partial = '';
    try {
      reader = port.readable!.pipeThrough(new TextDecoderStream()).getReader();
      while (!closed) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = (partial + value).split(/\r?\n/);
        // The last piece may be the start of a line still on its way.
        partial = lines.pop() ?? '';
        lines.forEach(onLine);
      }
    } catch (error) {
      if (!closed) onStatus({ state: 'error', kind: 'serial', message: `Lost the tracker: ${String(error)}` });
    }
  };
  read();

  return {
    close: () => {
      closed = true;
      reader
        ?.cancel()
        .catch(() => {})
        .finally(() => port.close().catch(() => {}));
      onStatus({ state: 'disconnected' });
    },
  };
}
