import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "https://testbackend-48oi.onrender.com";

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
