import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import type { CitySurveyState } from '../shared/citySurveyState.ts';
import type { CityView } from '../shared/cityView.ts';
import type { ServerEvent } from '../shared/protocol.ts';

/** Read-only monitor channel on /ws. HTTP GET /api/city-state and /api/city-view stay the recovery path after reconnects. */
export function attachRealtime(server: Server, current: () => { state: CitySurveyState; view: CityView }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  const send = (socket: WebSocket, event: ServerEvent) => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event)); };
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/ws') { socket.destroy(); return; }
    wss.handleUpgrade(request, socket, head, client => {
      client.on('error', error => console.warn('WebSocket client error', error.message));
      send(client, { type: 'city-state-snapshot', ...current() });
    });
  });
  return {
    broadcast(event: ServerEvent) { for (const client of wss.clients) send(client, event); },
    close() { for (const client of wss.clients) client.terminate(); wss.close(); },
  };
}
