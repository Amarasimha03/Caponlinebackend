import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  process.env.REACT_APP_SOCKET_URL ||
  'https://testbackend-j6dn.onrender.com';

// Create ONE global socket instance — never create inside components
const socket = io(SOCKET_URL, {
  autoConnect: false,    // do not connect until token is ready
  auth: (cb) => {
    // Called fresh on every connection/reconnection attempt
    const token = localStorage.getItem("token");
    cb({ token: token ? `Bearer ${token}` : "" });
  },
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,       // keep trying forever
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

let heartbeatInterval = null;

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (socket.connected) socket.emit('heartbeat');
  }, 10000);
});

socket.on('disconnect', (reason) => {
  console.warn('[Socket] Disconnected:', reason);
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
});

socket.on('connect_error', (err) => {
  console.warn('[Socket] Connection error:', err.message);
});

socket.on('reconnect', (attempt) => {
  console.log('[Socket] Reconnected after', attempt, 'attempt(s)');
  // Broadcast so all components know to refetch their data
  socket.emit('client:reconnected');
});

export default socket;
