#!/usr/bin/env node
// Forwards readings from an electromagnetic tracker to the flip book over a local WebSocket.
//
// Readings come in one per line, and the book (with the bridge connected in its tracker panel)
// receives every line. Either pipe a tracker program's text output in:
//
//   <tracker program> | node tools/tracker-bridge/bridge.mjs [--port 8787]
//
// or, on Windows, read the live export from Polhemus PiMgr (Motion > Export Realtime Motion Data):
//
//   node tools/tracker-bridge/bridge.mjs --pipe [PDIPnOPipe]
//
// --pipe connects to the named pipe PiMgr provides. If PiMgr instead expects to connect to a
// pipe itself, --pipe-server [name] creates the pipe for it.
//
// The book understands lines of plain numbers ending in "x y z azimuth elevation roll", or JSON
// ({"x":…, "y":…, "z":…, "azimuth":…, "elevation":…, "roll":…}). See README.md next to this file.
//
// Uses only Node's built-in modules, so there's nothing to install.

import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import readline from 'node:readline';

const args = process.argv.slice(2);
// An option's value, true if it's given without one, or undefined if it isn't given.
const option = (name) => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : true;
};
const PORT = Number(option('--port') ?? 8787);
const DEFAULT_PIPE = 'PDIPnOPipe';
// How often to look for PiMgr's pipe while it isn't there yet (ms).
const PIPE_RETRY = 2000;
// How many lines to show in the terminal when readings start, so their format can be checked.
const LINES_TO_SHOW = 3;

const pipePath = (name) => (name.startsWith('\\\\') ? name : `\\\\.\\pipe\\${name}`);
const pipeClient = option('--pipe');
const pipeServer = option('--pipe-server');

const clients = new Set();

// A WebSocket text frame from the server (servers never mask their frames).
function textFrame(text) {
  const payload = Buffer.from(text);
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, payload]);
}

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end(`Tracker bridge is running. In the book's tracker panel, connect to ws://localhost:${PORT}\n`);
});

server.on('upgrade', (request, socket) => {
  const key = request.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  clients.add(socket);
  console.log(`Book connected (${clients.size} open).`);

  // The book never sends anything but a close frame when it disconnects.
  socket.on('data', (data) => {
    if ((data[0] & 0x0f) === 0x8) socket.end(Buffer.from([0x88, 0x00]));
  });
  const forget = () => {
    if (clients.delete(socket)) console.log(`Book disconnected (${clients.size} open).`);
  };
  socket.on('close', forget);
  socket.on('error', forget);
});

server.listen(PORT, () => {
  console.log(`Tracker bridge listening on ws://localhost:${PORT}`);
  if (!pipeClient && !pipeServer && process.stdin.isTTY) {
    console.log('Waiting for tracker readings on standard input (pipe your tracker program into this one).');
  }
});

let linesSinceReport = 0;

// Sends each line from `input` to every connected book.
function forward(input, source) {
  let shown = 0;
  let warnedBinary = false;
  readline.createInterface({ input }).on('line', (line) => {
    if (!line.trim()) return;
    // Control characters mean binary data, which the book can't read.
    if (/[\x00-\x08\x0e-\x1f]/.test(line)) {
      if (!warnedBinary) {
        console.log(`${source} is sending binary data. In PiMgr, set the output format to ASCII.`);
        warnedBinary = true;
      }
      return;
    }
    if (shown < LINES_TO_SHOW) {
      console.log(`From ${source}: ${line}`);
      shown += 1;
    }
    linesSinceReport += 1;
    const frame = textFrame(line);
    for (const socket of clients) socket.write(frame);
  });
}

// Connects to the named pipe PiMgr exports to, retrying until it's there.
function readPipe(path) {
  let waiting = false;
  const connect = () => {
    let connected = false;
    const pipe = net.connect(path);
    pipe.on('connect', () => {
      connected = true;
      waiting = false;
      console.log(`Reading PiMgr's export from ${path}.`);
      forward(pipe, 'PiMgr');
    });
    pipe.on('error', (error) => {
      if (connected || waiting) return;
      waiting = true;
      console.log(`Waiting for ${path} (${error.code}).`);
      console.log('In PiMgr, turn on Motion > Export Realtime Motion Data, then continuous mode (C).');
    });
    pipe.on('close', () => {
      if (connected) console.log("PiMgr's export stopped. Waiting for it to start again.");
      setTimeout(connect, PIPE_RETRY);
    });
  };
  connect();
}

// Creates a named pipe and waits for PiMgr to connect to it and export into it.
function servePipe(path) {
  net
    .createServer((pipe) => {
      console.log('PiMgr connected to the pipe.');
      pipe.on('close', () => console.log('PiMgr disconnected from the pipe.'));
      pipe.on('error', () => {});
      forward(pipe, 'PiMgr');
    })
    .on('error', (error) => {
      console.error(`Couldn't create ${path}: ${error.message}`);
      process.exit(1);
    })
    .listen(path, () => console.log(`Waiting for PiMgr to connect to ${path}.`));
}

if (pipeServer) servePipe(pipePath(pipeServer === true ? DEFAULT_PIPE : pipeServer));
else if (pipeClient) readPipe(pipePath(pipeClient === true ? DEFAULT_PIPE : pipeClient));
else forward(process.stdin, 'input');

// A heartbeat in the terminal, so it's easy to tell whether readings are flowing.
setInterval(() => {
  if (linesSinceReport > 0) {
    console.log(`${Math.round(linesSinceReport / 5)} readings/s → ${clients.size} book(s)`);
  }
  linesSinceReport = 0;
}, 5000).unref();
