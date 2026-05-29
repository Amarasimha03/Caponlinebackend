import { io } from 'socket.io-client';

const IS_LOCAL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const SOCKET_URL = IS_LOCAL ? "http://localhost:5000" : "https://testbackend-a1nl.onrender.com";

const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    withCredentials: true
});

let heartbeatInterval = null;

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (socket.connected) socket.emit('heartbeat');
  }, 25000); // 25s — keeps Render from sleeping
});

socket.on('disconnect', (reason) => {
  console.warn('[Socket] Disconnected:', reason);
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  // Transport close on Render — socket will auto-reconnect via polling fallback
});

socket.on('connect_error', (err) => {
  console.warn('[Socket] Connection error:', err.message);
});

socket.on('reconnect', (attempt) => {
  console.log('[Socket] Reconnected after', attempt, 'attempt(s)');
  socket.emit('client:reconnected');
});

export default socket;
