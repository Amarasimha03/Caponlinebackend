import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,  // ✅ Keep retrying — critical for long exam sessions
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,     // ✅ Cap backoff at 10s to avoid long reconnect gaps
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
  // ✅ Re-emit admin:join so the admin automatically rejoins the monitoring room
  // The monitoringStore init() listener will also do this on 'connect', but we
  // emit here as a belt-and-suspenders safeguard for cases where init() already ran.
  socket.emit('client:reconnected');
  socket.emit('admin:join');
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
  window.location.href = '/exam-terminated'; // Matches the route in App.js
});

export default socket;