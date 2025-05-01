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

type IncomingMessage = {
  type: string;
  data: {
    retroGuid: string;
    item: {
      id: number;
      content: string;
      userId: number;
      categoryId: number;
      category: string;
      likes: number;
      likedBy: number[];
    };
    user: {
      id: number;
      name: string;
    };
  };
};

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
  const retroGuid = query.retroGuid as string;

  if (!retroGuid) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    socket.removeListener('error', onSocketPreError);

    // Add the retroSlug to the WebSocket object for reference
    (ws as any).retroGuid = retroGuid;
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: WebSocket & { retroGuid?: string }) => {
  if (!ws.retroGuid) {
    ws.close();
    return;
  }

  const retroGuid = ws.retroGuid;

  // Initialize room if it doesn't exist
  if (!retroRooms.has(retroGuid)) {
    retroRooms.set(retroGuid, new Set());
  }

  // Add client to room
  retroRooms.get(retroGuid)?.add(ws);
  console.log(
    `Client connected to retro room: ${retroGuid} at ${new Date().toLocaleTimeString()}`
  );

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    onSocketPostError(error);
  });

  ws.on('message', (data, isBinary) => {
    console.log('Raw message received:', data);
    const message = isBinary ? data : data.toString();
    console.log(`Decoded message in ${retroGuid}:`, message);

    // Broadcast to all clients in the same retro room
    const roomClients = retroRooms.get(retroGuid);

    // Check the type of the message
    let parsedMessage: { type?: string };
    try {
      parsedMessage = JSON.parse(message.toString()) as IncomingMessage;
    } catch (error) {
      console.error('Failed to parse message:', error);
      return;
    }

    if (
      parsedMessage.type === 'retro_item_unliked' ||
      parsedMessage.type === 'retro_item_liked'
    ) {
      console.log(
        `Broadcasting to all clients in room ${retroGuid}, including sender`
      );
      roomClients?.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          console.log('Sending message to client');
          client.send(message, { binary: isBinary });
        }
      });
      return;
    }

    if (roomClients) {
      console.log(
        `Broadcasting to ${roomClients.size} clients in room ${retroGuid}`
      );
      roomClients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          console.log('Sending message to client');
          client.send(message, { binary: isBinary });
        } else {
          console.log('Skipping client - either sender or not open');
        }
      });
    } else {
      console.log(`No clients found in room ${retroGuid}`);
    }
  });

  ws.on('close', () => {
    // Remove client from room
    const roomClients = retroRooms.get(retroGuid);
    if (roomClients) {
      roomClients.delete(ws);
      console.log(`Client disconnected from retro room: ${retroGuid}`);

      // Clean up empty rooms
      if (roomClients.size === 0) {
        retroRooms.delete(retroGuid);
      }
    }
  });
});
