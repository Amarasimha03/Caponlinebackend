import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "https://testbackend-48oi.onrender.com";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,
  reconnection: true,          // Keep true for normal drops
  reconnectionAttempts: 5,     // ✅ Limit retries (was infinite)
  reconnectionDelay: 2000,
});

let heartbeatInterval = null;

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (socket.connected) socket.emit('heartbeat');
  }, 25000);
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
  socket.emit('client:reconnected');
});

// ✅ THIS IS THE KEY FIX — listen for admin force-disconnect globally
socket.on('force-disconnect', () => {
  console.warn('[Socket] Force disconnected by admin');
  socket.removeAllListeners();   // Stop all event listeners
  socket.disconnect();           // Permanently disconnect
  clearInterval(heartbeatInterval);

  // Stop all media tracks (camera + screen share)
  navigator.mediaDevices?.getUserMedia({ video: false, audio: false })
    .catch(() => { });

  // Stop any active streams globally
  window.__activeCameraStream?.getTracks().forEach(t => t.stop());
  window.__activeScreenStream?.getTracks().forEach(t => t.stop());

  // ✅ Redirect employee out of exam
  window.location.href = '/exam-ended'; // 🔁 Change to your actual route
});

export default socket;