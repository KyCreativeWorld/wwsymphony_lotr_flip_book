#!/usr/bin/env node
// Forwards readings from an electromagnetic tracker to the flip book over a local WebSocket.
//
// Pipe the tracker's text output in, one reading per line, and the book (with the bridge
// connected in its tracker panel) receives every line:
//
//   <tracker program> | node tools/tracker-bridge/bridge.mjs [--port 8787]
//
// The book understands lines of plain numbers ("x y z azimuth elevation roll", optionally with
// a station number first) or JSON ({"x":…, "y":…, "z":…, "azimuth":…, "elevation":…, "roll":…}).
// See README.md next to this file.
//
// Uses only Node's built-in modules, so there's nothing to install.

import crypto from 'node:crypto';
import http from 'node:http';
import readline from 'node:readline';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const PORT = portIndex >= 0 ? Number(args[portIndex + 1]) : 8787;

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
  if (process.stdin.isTTY) {
    console.log('Waiting for tracker readings on standard input (pipe your tracker program into this one).');
  }
});

let linesSinceReport = 0;
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  linesSinceReport += 1;
  const frame = textFrame(line);
  for (const socket of clients) socket.write(frame);
});

// A heartbeat in the terminal, so it's easy to tell whether readings are flowing.
setInterval(() => {
  if (linesSinceReport > 0) {
    console.log(`${Math.round(linesSinceReport / 5)} readings/s → ${clients.size} book(s)`);
  }
  linesSinceReport = 0;
}, 5000).unref();
