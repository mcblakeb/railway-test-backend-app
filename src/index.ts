import { config } from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  config();
}

import { app } from './api';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';

const port = process.env.PORT || 3333;
const s = app.listen(port, () =>
  console.log(`Listening on http://localhost:${port}...`)
);

const wss = new WebSocketServer({ noServer: true });

// Track clients by retro slug
const retroRooms = new Map<string, Set<WebSocket>>();

function onSocketPreError(e: Error) {
  console.log(e);
}

function onSocketPostError(e: Error) {
  console.log(e);
}

s.on('upgrade', (request, socket, head) => {
  socket.on('error', onSocketPreError);

  const { query } = parse(request.url || '', true);
  const retroSlug = query.retroSlug as string;

  if (!retroSlug) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    socket.removeListener('error', onSocketPreError);

    // Add the retroSlug to the WebSocket object for reference
    (ws as any).retroSlug = retroSlug;
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: WebSocket & { retroSlug?: string }) => {
  if (!ws.retroSlug) {
    ws.close();
    return;
  }

  const retroSlug = ws.retroSlug;

  // Initialize room if it doesn't exist
  if (!retroRooms.has(retroSlug)) {
    retroRooms.set(retroSlug, new Set());
  }

  // Add client to room
  retroRooms.get(retroSlug)?.add(ws);
  console.log(
    `Client connected to retro room: ${retroSlug} at ${new Date().toLocaleTimeString()}`
  );

  ws.on('error', onSocketPostError);

  ws.on('message', (data, isBinary) => {
    const message = isBinary ? data : data.toString();
    console.log(`Received message in ${retroSlug}: ${message}`);

    // Broadcast to all clients in the same retro room
    const roomClients = retroRooms.get(retroSlug);
    if (roomClients) {
      roomClients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message, { binary: isBinary });
        }
      });
    }
  });

  ws.on('close', () => {
    // Remove client from room
    const roomClients = retroRooms.get(retroSlug);
    if (roomClients) {
      roomClients.delete(ws);
      console.log(`Client disconnected from retro room: ${retroSlug}`);

      // Clean up empty rooms
      if (roomClients.size === 0) {
        retroRooms.delete(retroSlug);
      }
    }
  });
});
