import WebSocket from 'ws';

// Node.js 18 has no global WebSocket; polyfill it for @supabase/realtime-js.
// Guard ensures this is a no-op in environments that already have WebSocket (Node 21+, browsers).
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).WebSocket = WebSocket;
}
