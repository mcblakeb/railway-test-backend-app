import { config } from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  config();
}

// call after config() to access the env variables
import { app } from './api';
import { WebSocketServer, WebSocket } from 'ws';

const port = process.env.PORT || 3333;

const s = app.listen(port, () =>
  console.log(`Listening on http://localhost:${port}...`)
);

const wss = new WebSocketServer({ noServer: true });

function onSocketPreError(e: Error) {
  console.log(e);
}

function onSocketPostError(e: Error) {
  console.log(e);
}

s.on('upgrade', (request, socket, head) => {
  socket.on('error', onSocketPreError);
  // perform auth here

  wss.handleUpgrade(request, socket, head, (ws) => {
    socket.removeListener('error', onSocketPreError);
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  ws.on('error', onSocketPostError);
  ws.on('message', (data, isBinary) => {
    wss.clients.forEach((client) => {
      console.log('Sending message to client: ' + data);
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
