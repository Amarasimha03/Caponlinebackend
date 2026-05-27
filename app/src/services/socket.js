import { io } from 'socket.io-client';

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  'https://testbackend-j6dn.onrender.com';

// Create ONE global socket instance — never inside components
const socket = io(SOCKET_URL, {
  autoConnect:          false,              // connect only when token confirmed present
  transports:           ['polling', 'websocket'], // polling FIRST — fixes Render transport close
  upgrade:              true,              // upgrade to websocket after polling handshake
  reconnection:         true,
  reconnectionAttempts: Infinity,
  reconnectionDelay:    2000,
  reconnectionDelayMax: 10000,
  timeout:              20000,
  auth: (cb) => {
    // Called fresh on every connection and reconnection attempt
    const token = localStorage.getItem('token');
    cb({ token: token ? `Bearer ${token}` : '' });
  },
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
