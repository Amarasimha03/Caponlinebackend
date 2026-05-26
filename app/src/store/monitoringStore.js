import { create } from 'zustand';
import socket from '../services/socket';
import api from '../services/api';

// Registry of RTCPeerConnections mapped by employeeId
// Stored outside the React/Zustand state tree to avoid proxying or triggering infinite renders
const peerConnections = {};

const useMonitoringStore = create((set, get) => ({
  activeExams: [],
  violations: [],
  connected: false,
  initialized: false,

  // Fetch active exams from backend and merge with current streaming state
  fetchMonitoringData: async () => {
    try {
      const res = await api.get('/live-monitoring');
      const fetched = res.data || [];

      set((state) => {
        const updatedExams = fetched.map((item) => {
          const existing = state.activeExams.find((p) => p.employeeId === item.employeeId);
          return {
            ...item,
            cameraActive: item.cameraActive || (existing ? existing.cameraActive : false),
            webrtcConnected: existing ? existing.webrtcConnected : (peerConnections[item.employeeId]?.connectionState === 'connected'),
            cameraStream: existing ? existing.cameraStream : null,
            screenStream: existing ? existing.screenStream : null,
            lastViolation: existing ? existing.lastViolation : null,
          };
        });
        return { activeExams: updatedExams };
      });
    } catch (err) {
      console.error('[MonitoringStore] Failed to fetch live-monitoring:', err);
    }
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

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerConnections[employeeId] = pc;

      pc.ontrack = (event) => {
        console.log(`[MonitoringStore] Received track from ${employeeId}`);
        const stream = event.streams[0];
        
        set((state) => {
          const updated = state.activeExams.map((e) => {
            if (e.employeeId === employeeId) {
              if (!e.cameraStream) {
                return { ...e, cameraStream: stream, webrtcConnected: true };
              } else if (e.cameraStream.id !== stream.id && !e.screenStream) {
                return { ...e, screenStream: stream, webrtcConnected: true };
              }
            }
            return e;
          });
          return { activeExams: updated };
        });
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
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
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
      set((state) => ({
        activeExams: state.activeExams.filter((e) => e.employeeId !== data.employeeId),
      }));
    });

    socket.on('exam:employee-disconnected', (data) => {
      set((state) => ({
        activeExams: state.activeExams.map((e) =>
          e.socketId === data.socketId ? { ...e, webrtcConnected: false } : e
        ),
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

  rejoin: () => {
    socket.emit('admin:join');
  },

  // Close and clean up all connections if needed
  destroy: () => {
    Object.keys(peerConnections).forEach((key) => {
      peerConnections[key].close();
      delete peerConnections[key];
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
