import { create } from 'zustand';
import socket from '../services/socket';
import api from '../services/api';

// Registry of RTCPeerConnections mapped by employeeId
// Stored outside the React/Zustand state tree to avoid proxying or triggering infinite renders
const peerConnections = {};

// Per-peer stream identity registry: maps employeeId → Set of seen stream IDs
// First unseen stream ID = camera, second unseen stream ID = screen
const peerStreamRegistry = {};

// Backoff counter — stops poll spam after repeated 401 / network failures
let consecutiveFailures = 0;
const MAX_FAILURES = 3;

const useMonitoringStore = create((set, get) => ({
  activeExams: [],
  violations: [],
  connected: false,
  initialized: false,

  // Fetch active exams from backend and merge with current streaming state
  fetchMonitoringData: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[MonitoringStore] No token — skipping fetch');
      return;
    }

    // Pause polling after too many consecutive failures — re-login to resume
    if (consecutiveFailures >= MAX_FAILURES) {
      console.warn(`[MonitoringStore] ${MAX_FAILURES} consecutive failures — polling paused. Re-login to resume.`);
      return;
    }

    try {
      const res     = await api.get('/live-monitoring');
      const fetched = res.data || [];
      consecutiveFailures = 0; // reset on success

      set((state) => {
        const updatedExams = fetched.map((item) => {
          const existing = state.activeExams.find((p) => p.employeeId === item.employeeId);
          return {
            ...item,
            cameraActive:    item.cameraActive || (existing?.cameraActive ?? false),
            webrtcConnected: existing?.webrtcConnected ?? (peerConnections[item.employeeId]?.connectionState === 'connected'),
            cameraStream:    existing?.cameraStream  ?? null,
            screenStream:    existing?.screenStream  ?? null,
            lastViolation:   existing?.lastViolation ?? null,
          };
        });
        return { activeExams: updatedExams };
      });

    } catch (err) {
      consecutiveFailures++;
      if (err.response?.status === 401) {
        console.error(`[MonitoringStore] 401 — token invalid (failure ${consecutiveFailures}/${MAX_FAILURES}). Check api.js interceptor.`);
      } else {
        console.error('[MonitoringStore] Fetch failed:', err.message);
      }
    }
  },

  // ✅ Restore streams from existing peer connections without renegotiating
  // Called when AdminMonitoring mounts/remounts after navigation
  restoreStreams: () => {
    const activePeers = Object.keys(peerConnections);
    if (activePeers.length === 0) return false; // No existing connections to restore

    let restoredCount = 0;
    set((state) => {
      const updatedExams = state.activeExams.map((exam) => {
        const pc = peerConnections[exam.employeeId];
        if (!pc) return exam;

        // If still connected and streams already in state, keep them
        if (exam.cameraStream || exam.screenStream) {
          restoredCount++;
          return exam;
        }

        // Try to restore from active receivers
        const receivers = pc.getReceivers ? pc.getReceivers() : [];
        const videoReceivers = receivers.filter(r => r.track && r.track.kind === 'video' && r.track.readyState === 'live');

        if (videoReceivers.length === 0) return exam;

        let cameraStream = exam.cameraStream;
        let screenStream = exam.screenStream;

        if (!cameraStream && videoReceivers[0]?.track) {
          cameraStream = new MediaStream([videoReceivers[0].track]);
          console.log(`[MonitoringStore] Restored camera stream for ${exam.employeeId}`);
        }
        if (!screenStream && videoReceivers[1]?.track) {
          screenStream = new MediaStream([videoReceivers[1].track]);
          console.log(`[MonitoringStore] Restored screen stream for ${exam.employeeId}`);
        }

        if (cameraStream || screenStream) restoredCount++;

        return {
          ...exam,
          cameraStream: cameraStream ?? exam.cameraStream,
          screenStream: screenStream ?? exam.screenStream,
          webrtcConnected: pc.connectionState === 'connected' || exam.webrtcConnected,
        };
      });
      return { activeExams: updatedExams };
    });

    console.log(`[MonitoringStore] restoreStreams: restored ${restoredCount} peers`);
    return restoredCount > 0;
  },

  // Initialize Socket.IO listeners exactly once
  init: () => {
    if (get().initialized) return;

    socket.on('connect', () => {
      set({ connected: true });
      socket.emit('admin:join');
    });

    socket.on('admin:active-exams', (exams) => {
      set((state) => {
        const updated = exams.map((e) => {
          const existing = state.activeExams.find((p) => p.employeeId === e.employeeId);
          return {
            ...e,
            cameraActive: true,
            webrtcConnected: existing ? existing.webrtcConnected : false,
            cameraStream: existing ? existing.cameraStream : null,
            screenStream: existing ? existing.screenStream : null,
            lastViolation: existing ? existing.lastViolation : null,
          };
        });
        return { activeExams: updated };
      });
    });

    socket.on('exam:employee-joined', (data) => {
      set((state) => {
        if (state.activeExams.some((e) => e.employeeId === data.employeeId)) return {};
        return {
          activeExams: [
            ...state.activeExams,
            { ...data, cameraActive: true, webrtcConnected: false, cameraStream: null, screenStream: null }
          ]
        };
      });
      // Request renegotiation to establish connection
      socket.emit('webrtc:request-renegotiate');
    });

    socket.on('webrtc:offer', async (data) => {
      const { employeeId, offer, socketId } = data;
      console.log(`[MonitoringStore] WebRTC offer received from ${employeeId}`);

      // Close existing connection if any
      if (peerConnections[employeeId]) {
        peerConnections[employeeId].close();
      }

      // Reset stream registry for this peer
      peerStreamRegistry[employeeId] = new Set();

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerConnections[employeeId] = pc;

      pc.ontrack = (event) => {
        console.log(`[MonitoringStore] Received track from ${employeeId}`, event.track.kind, event.track.label);

        const track = event.track;
        if (track.kind !== 'video') return; // Only map video tracks

        // ✅ Stream-identity-based assignment (fixes black screen)
        // The employee sends: cameraStream tracks first, then screenStream tracks.
        // Each group has its own distinct MediaStream object.
        // We use a registry of seen stream IDs to determine camera vs. screen.
        const stream = event.streams[0] || new MediaStream([track]);
        const registry = peerStreamRegistry[employeeId];

        if (!registry.has(stream.id)) {
          registry.add(stream.id);
          const isFirstStream = registry.size === 1;

          set((state) => {
            const updated = state.activeExams.map((e) => {
              if (e.employeeId !== employeeId) return e;
              if (isFirstStream) {
                console.log(`[MonitoringStore] Setting CAMERA stream for ${employeeId} (stream: ${stream.id})`);
                return { ...e, cameraStream: stream, webrtcConnected: true };
              } else {
                console.log(`[MonitoringStore] Setting SCREEN stream for ${employeeId} (stream: ${stream.id})`);
                return { ...e, screenStream: stream, webrtcConnected: true };
              }
            });
            return { activeExams: updated };
          });
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc:ice-candidate', { to: socketId, candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`[MonitoringStore] Connection state changed for ${employeeId}: ${state}`);
        if (state === 'disconnected' || state === 'failed') {
          set((s) => ({
            activeExams: s.activeExams.map((e) =>
              e.employeeId === employeeId ? { ...e, webrtcConnected: false } : e
            ),
          }));
        } else if (state === 'connected') {
          set((s) => ({
            activeExams: s.activeExams.map((e) =>
              e.employeeId === employeeId ? { ...e, webrtcConnected: true } : e
            ),
          }));
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        if (pc.candidateQueue) {
          for (const candidate of pc.candidateQueue) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Queued AddIceCandidate Error:", e));
          }
          pc.candidateQueue = [];
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { to: socketId, answer });
      } catch (err) {
        console.error('[MonitoringStore] WebRTC signaling error:', err);
      }
    });

    socket.on('webrtc:ice-candidate', async (data) => {
      const pc = peerConnections[data.employeeId];
      if (pc && data.candidate) {
        try {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            if (!pc.candidateQueue) pc.candidateQueue = [];
            pc.candidateQueue.push(data.candidate);
          }
        } catch (err) {
          console.error('[MonitoringStore] AddIceCandidate error:', err);
        }
      }
    });

    socket.on('exam:completed', (data) => {
      console.log(`[MonitoringStore] Exam completed/terminated for ${data.employeeId}`);
      if (peerConnections[data.employeeId]) {
        peerConnections[data.employeeId].close();
        delete peerConnections[data.employeeId];
      }
      delete peerStreamRegistry[data.employeeId];
      set((state) => ({
        activeExams: state.activeExams.filter((e) => e.employeeId !== data.employeeId),
      }));
    });

    socket.on('exam:employee-disconnected', (data) => {
      console.log(`[MonitoringStore] Employee disconnected: ${data.employeeId}`);
      if (peerConnections[data.employeeId]) {
        peerConnections[data.employeeId].close();
        delete peerConnections[data.employeeId];
      }
      delete peerStreamRegistry[data.employeeId];
      set((state) => ({
        activeExams: state.activeExams.filter((e) => e.employeeId !== data.employeeId),
      }));
    });

    socket.on('violation:alert', (data) => {
      console.log(`[MonitoringStore] Proctoring alert for ${data.employeeName}: ${data.description}`);
      const alertWithTime = { ...data, timestamp: new Date() };
      set((state) => ({
        violations: [alertWithTime, ...state.violations].slice(0, 50),
        activeExams: state.activeExams.map((e) =>
          e.employeeId === data.employeeId
            ? { ...e, lastViolation: data.description, violationCount: (e.violationCount || 0) + 1 }
            : e
        ),
      }));
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    if (socket.connected) {
      set({ connected: true });
      socket.emit('admin:join');
    }

    set({ initialized: true });
  },

  // ✅ Fix 1 — Terminate an employee's exam from the admin side
  terminateExam: (employeeId, employeeSocketId) => {
    console.log(`[MonitoringStore] Terminating exam for ${employeeId}`);

    // Tell server to force-disconnect the employee's socket
    socket.emit('admin:terminate-exam', { employeeId, employeeSocketId });

    // Close peer connection on admin side
    if (peerConnections[employeeId]) {
      peerConnections[employeeId].close();
      delete peerConnections[employeeId];
    }
    delete peerStreamRegistry[employeeId];

    // Remove from admin UI immediately (don't wait for exam:completed echo)
    set((state) => ({
      activeExams: state.activeExams.filter((e) => e.employeeId !== employeeId),
    }));
  },

  // ✅ Rejoin admin room — tries restoreStreams first, falls back to renegotiation
  rejoin: () => {
    socket.emit('admin:join');
    // restoreStreams() will be called by AdminMonitoring on mount — 
    // do not force renegotiation if peers are already connected
  },

  // Close and clean up all connections if needed
  destroy: () => {
    Object.keys(peerConnections).forEach((key) => {
      peerConnections[key].close();
      delete peerConnections[key];
    });
    Object.keys(peerStreamRegistry).forEach((key) => {
      delete peerStreamRegistry[key];
    });
    socket.off('connect');
    socket.off('admin:active-exams');
    socket.off('exam:employee-joined');
    socket.off('webrtc:offer');
    socket.off('webrtc:ice-candidate');
    socket.off('exam:completed');
    socket.off('exam:employee-disconnected');
    socket.off('violation:alert');
    socket.off('disconnect');
    set({ initialized: false, activeExams: [], violations: [], connected: false });
  }
}));

export default useMonitoringStore;
