import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Camera, Shield, ChevronRight, Loader2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import socket from '../../services/socket';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function ExamPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [phase, setPhase]           = useState('setup'); // setup, webcam, exam, submitted
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [currentQ, setCurrentQ]     = useState(0);
  const [answers, setAnswers]       = useState({});
  const [timer, setTimer]           = useState(1800); // Default to 30 mins
  const [resultId, setResultId]     = useState(null);
  const [violations, setViolations] = useState(0);
  const [maxViolations, setMaxViolations] = useState(3);
  const [webcamReady, setWebcamReady]     = useState(false);
  const [submitting, setSubmitting]       = useState(false);

  const [cameraWarnings, setCameraWarnings] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cameraError, setCameraError]     = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const cameraRequestingRef = useRef(false);

  // localStorage key for this specific exam session
  const LS_EXAM_KEY = `examState_${assessmentId}`;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const simulationIntervalRef = useRef(null);
  const faceModelRef = useRef(null);
  const multiplePersonWarningsRef = useRef(0);
  const tabSwitchWarningsRef = useRef(0);
  const peerConnectionRef = useRef(null);
  const lastCameraWarningRef = useRef(Date.now());
  const lastFaceDetectedTimeRef = useRef(Date.now());
  const multiPersonActiveSinceRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        // Check browser compatibility: Support Chrome, Edge, Firefox. Disable unsupported browsers.
        const ua = navigator.userAgent.toLowerCase();
        const isChrome = ua.includes('chrome') && !ua.includes('edge') && !ua.includes('opr');
        const isEdge = ua.includes('edg');
        const isFirefox = ua.includes('firefox');
        if (!isChrome && !isEdge && !isFirefox) {
          toast.error('Unsupported browser detected. Please use Chrome, Edge, or Firefox.');
          alert('Unsupported browser detected. Please use Chrome, Edge, or Firefox.');
          navigate('/dashboard');
          return;
        // Check if employee already completed this exam
        const myExamsRes = await api.get('/assessments/my');
        if (myExamsRes.data.success) {
          const matchedExam = myExamsRes.data.assessments?.find(a => a._id === assessmentId);
          if (matchedExam && matchedExam.status === 'completed') {
            toast.error('You have already completed this assessment. Retakes are not allowed.');
            alert('You have already completed this assessment. Retakes are not allowed.');
            navigate('/employee/dashboard');
            return;
          }
        }

        const { data } = await api.get(`/assessments/${assessmentId}`);
        setAssessment(data.assessment);
        setQuestions(data.assessment.questions || []);
        setMaxViolations(data.assessment.maxViolations || 3);
        setTimer((data.assessment.duration || 30) * 60);

        // ── Restore from localStorage first (instant, no network) ──
        const lsCached = localStorage.getItem(LS_EXAM_KEY);
        if (lsCached) {
          try {
            const saved = JSON.parse(lsCached);
            if (saved.assessmentId === assessmentId) {
              if (saved.phase && saved.phase !== 'submitted') setPhase(saved.phase);
              if (saved.currentQ !== undefined) setCurrentQ(saved.currentQ);
              if (saved.timer)     setTimer(saved.timer);
              if (saved.resultId)  setResultId(saved.resultId);
              if (saved.violations !== undefined) setViolations(saved.violations);
              if (saved.answers && Object.keys(saved.answers).length > 0) setAnswers(saved.answers);
            }
          } catch { /* ignore corrupt cache */ }
        }

        // ── Then fetch from server (authoritative) ──
        if (user?._id) {
          try {
            // Restore Metadata
            const metaRes = await api.get(`/state/exam/meta/${user._id}/${assessmentId}`);
            if (metaRes.data.success && metaRes.data.meta) {
              const meta = metaRes.data.meta;
              if (meta.phase) setPhase(meta.phase);
              if (meta.currentQ) setCurrentQ(Number(meta.currentQ));
              if (meta.timer) setTimer(Number(meta.timer));
              if (meta.resultId) setResultId(meta.resultId);
              if (meta.violations) setViolations(Number(meta.violations));
            }

            // Restore Answers
            const stateRes = await api.get(`/state/exam/${user._id}`);
            if (stateRes.data.success && stateRes.data.examData) {
              const restoredAnswers = {};
              stateRes.data.examData.forEach(row => {
                if (row.examId === assessmentId) {
                  restoredAnswers[row.questionId] = {
                    selectedOptions: row.selectedAnswer ? row.selectedAnswer.split(',').map(Number) : []
                  };
                }
              });
              
              // Only override if we found saved answers
              if (Object.keys(restoredAnswers).length > 0) {
                setAnswers(prev => ({ ...prev, ...restoredAnswers }));
              }
            }
          } catch (err) {
            console.error('Failed to restore state from sheets', err);
          }
        }

        // Load ML Model silently
        try {
          await tf.ready();
          faceModelRef.current = await blazeface.load();
        } catch (err) { console.error("BlazeFace load error:", err); }

      } catch { toast.error('Failed to load exam'); navigate('/dashboard'); }
    })();
  }, [assessmentId, navigate, LS_EXAM_KEY, user?._id]);

  // Socket
  useEffect(() => {
    socketRef.current = socket;
    
    const handleConnect = () => {
      if (phase === 'exam' && user?._id) {
        console.log('[Socket] Re-emitting exam:start on reconnect');
        socketRef.current?.emit('exam:start', {
          employeeId: user._id,
          employeeName: user.fullName,
          examId: assessmentId,
        });
        setupWebRTC();
      }
    };

    socketRef.current?.on('connect', handleConnect);
    return () => {
      socketRef.current?.off('connect', handleConnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, user, assessmentId]);

  // Re-bind webcam stream to the newly mounted video element when entering the exam phase
  useEffect(() => {
    if (phase === 'exam' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
    // Auto-start webcam if we restored into exam phase and don't have it
    if (phase === 'exam' && !webcamReady && !streamRef.current) {
      startWebcam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, webcamReady]);

  // Auto-start webcam when entering the webcam verification phase (video element is now mounted)
  useEffect(() => {
    if (phase === 'webcam') {
      startWebcam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Sync Metadata to both localStorage and Sheets when it changes
  useEffect(() => {
    if (phase !== 'setup' && phase !== 'submitted') {
      // Save to localStorage immediately (no network needed)
      const snapshot = { assessmentId, phase, currentQ, timer, resultId, violations, answers };
      localStorage.setItem(LS_EXAM_KEY, JSON.stringify(snapshot));

      // Save to server (Google Sheets) asynchronously
      if (user?._id) {
        api.post('/state/exam/meta/save', {
          userId: user._id,
          examId: assessmentId,
          phase,
          currentQ,
          timer,
          resultId,
          violations
        }).catch(()=>{});
      }
    }
    // Clear exam cache when submitted
    if (phase === 'submitted') {
      localStorage.removeItem(LS_EXAM_KEY);
    }
  }, [phase, currentQ, timer, resultId, violations, assessmentId, user, answers, LS_EXAM_KEY]);

  const cleanupMediaStreams = useCallback(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        screenStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      socketRef.current?.emit('exam:submit', { employeeId: user?._id, assessmentId });
    } catch (err) {
      console.warn("Cleanup media streams error:", err);
    }
  }, [assessmentId, user?._id]);

  // Setup webcam (camera only — screen sharing is requested at exam start)
  const startWebcam = async () => {
    // Prevent duplicate requests
    if (cameraRequestingRef.current) return;
    cameraRequestingRef.current = true;
    setCameraLoading(true);
    setCameraError('');

    // Check HTTPS requirement
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError('Camera access requires a secure HTTPS connection.');
      setCameraLoading(false);
      cameraRequestingRef.current = false;
      return;
    }

    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Your browser does not support camera access. Please use Chrome, Edge, or Firefox.');
      setCameraLoading(false);
      cameraRequestingRef.current = false;
      return;
    }

    try {
      // Cleanup any existing streams first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false
        });
        console.log('Camera stream started (video only):', stream);
      } catch (videoOnlyErr) {
        console.warn('High-res camera failed, trying lower resolution...', videoOnlyErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        console.log('Camera stream started (fallback):', stream);
      }

      streamRef.current = stream;

      // Bind to video element — may need a small delay for React mount
      const bindStream = () => {
        if (videoRef.current) {
          if (videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream;
          }
          videoRef.current.play().then(() => {
            console.log('Video playback started successfully');
          }).catch(e => {
            if (e.name !== 'AbortError') {
              console.warn('Video play() failed:', e);
            }
          });
        }
      };
      bindStream();
      // Retry binding after a short delay in case video element wasn't mounted yet
      setTimeout(bindStream, 300);

      if (!stream.active) {
        setCameraError('Camera is not active. It may be blocked by another application (Zoom, Meet, Teams). Close them and retry.');
        setCameraLoading(false);
        cameraRequestingRef.current = false;
        return;
      }

      setWebcamReady(true);
      setCameraError('');
      api.post('/state/monitor/save', { userId: user?._id, cameraStatus: 'active' }).catch(() => {});
      console.log('Webcam ready — camera active');
    } catch (err) {
      console.error('Webcam Error:', err);
      let errorMsg = 'Camera access failed. ';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera access denied. Please allow webcam permission in your browser settings and retry.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No webcam device found. Please connect a camera and retry.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is already in use by another application (Zoom, Google Meet, Teams). Close it and retry.';
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = 'Camera does not support the required resolution. Retrying with default settings...';
      } else if (err.name === 'AbortError') {
        errorMsg = 'Camera request was interrupted. Please retry.';
      } else {
        errorMsg += err.message || 'Unknown error occurred.';
      }
      setCameraError(errorMsg);
      setWebcamReady(false);
      api.post('/state/monitor/save', { userId: user?._id, cameraStatus: 'denied' }).catch(() => {});
    } finally {
      setCameraLoading(false);
      cameraRequestingRef.current = false;
    }
  };

  // Auto-reconnect camera on device change
  const reconnectCamera = async () => {
    try {
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: true
        });
      } catch (audioErr) {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: false
        });
      }
      streamRef.current = newStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn("Camera play on reconnect failed:", e);
        }
      }
    } catch (err) {
      console.error('Camera reconnect failed', err);
    }
  };

  useEffect(() => {
    navigator.mediaDevices.ondevicechange = () => reconnectCamera();
    return () => {
      navigator.mediaDevices.ondevicechange = null;
      cleanupMediaStreams();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupMediaStreams]);

  // Start exam (also requests screen sharing here so webcam verification isn't blocked)
  const startExam = async () => {
    try {
      // Request screen sharing before starting the exam
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screenStream;
        screenStream.getVideoTracks()[0].onended = () => {
          logViolation('screen-sharing-stopped', 'Screen sharing was revoked by the candidate');
          api.post('/state/monitor/save', { userId: user?._id, screenShareStatus: 'stopped' }).catch(() => {});
        };
        api.post('/state/monitor/save', { userId: user?._id, screenShareStatus: 'active' }).catch(() => {});
      } catch (err) {
        toast.error('Screen sharing permission is mandatory for this assessment.', { duration: 5000 });
        return; // Don't start exam without screen share
      }

      const { data } = await api.post('/assessments/start', { assessmentId });
      setResultId(data.result._id);
      setPhase('exam');
      setTimer(assessment?.timePerQuestion || 30);
      socketRef.current?.emit('exam:start', {
        employeeId: user?._id, examId: assessmentId, employeeName: user?.fullName,
      });

      setupWebRTC();

      // Request fullscreen
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen request failed:", err);
      }
    } catch (err) { toast.error('Failed to start exam'); }
  };

  const setupWebRTC = async () => {
    if (!socketRef.current) return;

    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    // Add local camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, streamRef.current);
      });
    }

    // Add local screen stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, screenStreamRef.current);
      });
    }

    // Send ICE candidates to admin
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc:ice-candidate', {
          toAdmin: true,
          employeeId: user?._id,
          candidate: event.candidate,
        });
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('webrtc:offer', {
        employeeId: user?._id,
        offer: offer,
      });
    } catch (err) {
      console.error('WebRTC Offer Error:', err);
    }
  };

  // Listen for WebRTC Answer and ICE Candidates from Admin
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;

    const handleAnswer = async (data) => {
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
        try {
          const pc = peerConnectionRef.current;
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          if (pc.candidateQueue) {
            for (const candidate of pc.candidateQueue) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Queued AddIceCandidate Error:", e));
            }
            pc.candidateQueue = [];
          }
        } catch (err) {
          console.error("SetRemoteDescription Error:", err);
        }
      }
    };

    const handleIceCandidate = async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          const pc = peerConnectionRef.current;
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            if (!pc.candidateQueue) pc.candidateQueue = [];
            pc.candidateQueue.push(data.candidate);
          }
        } catch (err) {
          console.error("AddIceCandidate Error:", err);
        }
      }
    };

    const handleRenegotiate = () => {
      console.log("[WebRTC] Renegotiate requested");
      setupWebRTC();
    };

    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:request-renegotiate', handleRenegotiate);

    return () => {
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('webrtc:request-renegotiate', handleRenegotiate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const handleSubmit = async (autoSubmit = false, terminationReason = null) => {
    if (submitting) return;

    // Direct submit / end of exam validation
    // Skip validation only for auto-submit due to cheating/terminations
    if (!autoSubmit) {
      const lastQIndex = questions.length - 1;
      const lastQ = questions[lastQIndex];
      const hasLastAnswer = lastQ && (answers[lastQ._id]?.selectedOptions?.length || 0) > 0;
      if (!hasLastAnswer) {
        toast.error("Please answer the last question before submitting.");
        alert("Please answer the last question before submitting.");
        return;
      }
    }

    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      const answerArray = questions.map(q => ({
        questionId: q._id,
        selectedOptions: answers[q._id]?.selectedOptions || [],
        timeTaken: 0,
      }));
      const payload = {
        resultId, answers: answerArray, autoSubmit,
      };
      if (terminationReason) payload.terminationReason = terminationReason;

      const { data } = await api.post('/assessments/submit', payload);
      if (data.success) {
        toast.success("Result saved successfully");
      }
      socketRef.current?.emit('exam:submit', { employeeId: user?._id, assessmentId, terminationReason });
      
      cleanupMediaStreams();
      
      // Clear exam cache immediately upon submission to prevent reloading old state on next attempt
      localStorage.removeItem(LS_EXAM_KEY);

      // Safely exit fullscreen only if active, catching any document inactive errors
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn("Fullscreen exit failed:", err);
        });
      }

      navigate(`/employee/result/${assessmentId}`, { replace: true });
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Google Sheet synchronization failed. Please try again.';
      toast.error(errMsg);
      setSubmitting(false);
    }
  };

  const handleNext = useCallback(() => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setTimer(assessment?.timePerQuestion || 30);
      socketRef.current?.emit('exam:progress', {
        employeeId: user?._id, assessmentId,
        progress: Math.round(((currentQ + 1) / questions.length) * 100),
      });
    } else {
      // Last question validation
      const lastQIndex = questions.length - 1;
      const lastQ = questions[lastQIndex];
      const hasLastAnswer = lastQ && (answers[lastQ._id]?.selectedOptions?.length || 0) > 0;
      if (!hasLastAnswer) {
        toast.error("Please answer the last question before submitting.");
        alert("Please answer the last question before submitting.");
        return;
      }
      handleSubmit(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, questions.length, user?._id, assessmentId, assessment?.timePerQuestion, answers]);

  // Per-question fixed countdown timer
  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // If timer ends on the last question, we must handle it
          const lastQIndex = questions.length - 1;
          if (currentQ === lastQIndex) {
            const lastQ = questions[lastQIndex];
            const hasLastAnswer = lastQ && (answers[lastQ._id]?.selectedOptions?.length || 0) > 0;
            if (!hasLastAnswer) {
              toast.error("Please answer the last question before submitting.");
              alert("Please answer the last question before submitting.");
              return assessment?.timePerQuestion || 30; // Reset timer or keep warning
            }
          }
          handleNext(); // auto skip to next question or submit
          return assessment?.timePerQuestion || 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentQ, handleNext, assessment?.timePerQuestion, answers, questions]);

  // Anti-cheating: visibility, fullscreen, keyboard
  useEffect(() => {
    if (phase !== 'exam') return;

    const handleVisibility = () => {
      if (document.hidden) {
        tabSwitchWarningsRef.current += 1;
        const count = tabSwitchWarningsRef.current;
        let msg = "";
        if (count === 1) msg = "Tab switch detected. Do not leave the exam window.";
        else if (count === 2) msg = "Second warning. Tab switching is not allowed.";
        else if (count === 3) msg = "Final warning for tab switching. Exam will be cancelled.";
        else msg = "Terminated due to Tab Switching.";

        toast.error(`Warning ${count}: ${msg}`, { duration: 5000 });
        logViolation('tab-switch', msg, count >= 4 ? "Terminated - Tab Switching" : null);
      }
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && phase === 'exam') logViolation('fullscreen-exit', 'Exited fullscreen');
    };
    const handleBlur = () => logViolation('focus-loss', 'Window lost focus');
    const handleContextMenu = (e) => { e.preventDefault(); logViolation('right-click', 'Right-click attempted'); };
    const handleKeyDown = (e) => {
      // Block copy/paste, devtools, alt+tab
      if ((e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'a')) ||
        (e.key === 'F12') ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.altKey && e.key === 'Tab') ||
        (e.key === 'PrintScreen')) {
        e.preventDefault();
        logViolation('devtools', `Blocked: ${e.key}`);
      }
    };
    const handleCopy = (e) => { e.preventDefault(); logViolation('copy-paste', 'Copy attempted'); };
    const handlePaste = (e) => { e.preventDefault(); logViolation('copy-paste', 'Paste attempted'); };
    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Camera OFF detection loop (every 5 seconds)
  useEffect(() => {
    if (phase !== 'exam') return;

    const interval = setInterval(() => {
      const videoTrack = streamRef.current?.getVideoTracks()?.[0];
      if (!videoTrack || videoTrack.readyState !== "live" || !videoTrack.enabled) {
        handleCameraViolation();
        reconnectCamera();
      }
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cameraWarnings, resultId]);

  const handleCameraViolation = () => {
    const count = cameraWarnings + 1;
    setCameraWarnings(count);

    if (count <= 3) {
      alert(`Warning ${count}: Camera must stay ON`);
      logViolation('camera-off', `Warning ${count}: Camera was turned OFF`);
    } else if (count >= 4) {
      alert("Exam terminated due to multiple camera violations");
      submitExamAutomatically();
    }
  };

  const submitExamAutomatically = async (reason = "Camera Violations") => {
    try {
      // 1. Stop exam timer and monitoring intervals
      if (timerRef.current) clearInterval(timerRef.current);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);

      // 2. Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn('Fullscreen exit failed:', err));
      }

      // Prepare answer array from current state
      const answerArray = questions.map(q => ({
        questionId: q._id,
        selectedOptions: answers[q._id]?.selectedOptions || [],
        timeTaken: 0,
      }));

      // 3. Send cancellation to backend with current answers
      await api.post("/submit-exam", {
        employeeId: user?._id,
        reason: reason,
        resultId: resultId,
        answers: answerArray,
      });

      // 4. Stop camera, screen share, and WebRTC
      cleanupMediaStreams();

      // 5. Clear all exam-related localStorage/sessionStorage data
      localStorage.removeItem(LS_EXAM_KEY);
      localStorage.removeItem('activeTest');
      localStorage.removeItem('examProgress');
      sessionStorage.removeItem('examActive');

      // 6. Disconnect socket for this exam session
      socketRef.current?.emit('exam:cancelled', { employeeId: user?._id, assessmentId });

      // 7. Redirect to employee dashboard if user cancelled, otherwise redirect to login
      if (reason === 'User Cancelled Exam') {
        navigate("/employee/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    } catch (err) {
      console.error("Auto submit failed:", err);
      // Cleanup even on failure
      if (timerRef.current) clearInterval(timerRef.current);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      cleanupMediaStreams();
      localStorage.removeItem(LS_EXAM_KEY);
      localStorage.removeItem('activeTest');
      localStorage.removeItem('examProgress');
      sessionStorage.removeItem('examActive');
      if (reason === 'User Cancelled Exam') {
        navigate("/employee/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }
  };

  // Real-time webcam face anomaly detection simulation loop
  useEffect(() => {
    if (phase !== 'exam') return;

    simulationIntervalRef.current = setInterval(async () => {
      // Real Face / Webcam proctoring
      if (faceModelRef.current && videoRef.current && webcamReady) {
        try {
          const predictions = await faceModelRef.current.estimateFaces(videoRef.current, false);

          // Apply false detection filters
          const validPersons = predictions.filter(p => {
            // Minimum confidence score check (85%)
            const score = Array.isArray(p.probability) ? p.probability[0] : (p.probability || p.score || 1);
            if (score < 0.85) return false;

            // Ignore extremely small background faces / unstable bounding boxes
            if (p.topLeft && p.bottomRight) {
              const width = p.bottomRight[0] - p.topLeft[0];
              const height = p.bottomRight[1] - p.topLeft[1];
              if (width < 80 || height < 80) return false;
            }
            return true;
          });

          if (validPersons.length === 1) {
            // Single person → exam continues normally, reset timers
            lastFaceDetectedTimeRef.current = Date.now();
            multiPersonActiveSinceRef.current = null;
          } else if (validPersons.length === 0) {
            // Face Not Visible
            multiPersonActiveSinceRef.current = null;
            const timeWithoutFace = (Date.now() - lastFaceDetectedTimeRef.current) / 1000;

            if (timeWithoutFace >= 15) {
              const msg = "Terminated due to Face Not Visible for 15+ seconds.";
              toast.error(msg, { duration: 5000 });
              logViolation('no-face', msg, "Terminated - Face Not Visible");
            } else if (timeWithoutFace >= 5 && Date.now() - lastCameraWarningRef.current > 6000) {
              lastCameraWarningRef.current = Date.now();
              toast.error(`Warning: Face missing for ${Math.floor(timeWithoutFace)}s. Exam auto-cancels at 15s.`, { duration: 4000 });
              logViolation('no-face', `Face missing for ${Math.floor(timeWithoutFace)}s`);
            }
          } else if (validPersons.length > 1) {
            // Multiple Persons Detection with continuous 5 seconds stability check
            if (!multiPersonActiveSinceRef.current) {
              multiPersonActiveSinceRef.current = Date.now();
            } else {
              const duration = Date.now() - multiPersonActiveSinceRef.current;
              if (duration >= 5000) { // Continuous detection for 5 seconds
                multiPersonActiveSinceRef.current = Date.now(); // reset timer for next check interval

                multiplePersonWarningsRef.current += 1;
                const count = multiplePersonWarningsRef.current;
                let msg = "";

                if (count === 1) {
                  msg = "Warning 1:\nMultiple persons detected.\nPlease ensure only one person is visible.";
                } else if (count === 2) {
                  msg = "Warning 2:\nAnother person is still detected.\nExam may be cancelled.";
                } else if (count === 3) {
                  msg = "Final Warning:\nMultiple persons detected again.\nNext violation will automatically terminate the exam.";
                } else {
                  msg = "Exam terminated due to repeated multiple-person violations.";
                }

                toast.error(msg, { duration: 6000 });
                alert(msg);

                if (count >= 4) {
                  logViolation('multiple-persons', msg, "Terminated - Multiple Person Detected");
                } else {
                  logViolation('multiple-persons', msg);
                }
              }
            }
          }
        } catch (err) {
          console.error("Face detection error:", err);
        }
      }
    }, 1000); // Poll faster (every 1 second) to get responsive and stable frame-by-frame updates

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, resultId, violations]);

  const logViolation = async (type, description, customTerminationReason = null) => {
    const newCount = violations + 1;
    setViolations(newCount);
    toast.error(`⚠️ Violation: ${description}`, { duration: 3000 });
    socketRef.current?.emit('violation:detected', {
      employeeId: user?._id, employeeName: user?.fullName,
      assessmentId, type, description,
    });
    try {
      const { data } = await api.post('/violations', {
        assessmentId, resultId, type, description, severity: 'medium',
      });
      if (data.autoSubmit || newCount >= maxViolations || customTerminationReason) {
        const reason = customTerminationReason || `Terminated - Maximum Violations Reached`;
        toast.error(reason, { duration: 5000 });
        await submitExamAutomatically(reason);
      }
    } catch { }
  };

  const handleSelect = (questionId, optionIndex) => {
    const q = questions[currentQ];
    let updatedOptions;

    if (q.type === 'multiple-select') {
      const current = answers[questionId]?.selectedOptions || [];
      updatedOptions = current.includes(optionIndex)
        ? current.filter(i => i !== optionIndex)
        : [...current, optionIndex];
      setAnswers({ ...answers, [questionId]: { selectedOptions: updatedOptions } });
    } else {
      updatedOptions = [optionIndex];
      setAnswers({ ...answers, [questionId]: { selectedOptions: updatedOptions } });
    }

    // Save answer to localStorage immediately
    const snapshot = { assessmentId, phase, currentQ, timer, resultId, violations, answers: { ...answers, [questionId]: { selectedOptions: updatedOptions } } };
    localStorage.setItem(LS_EXAM_KEY, JSON.stringify(snapshot));

    // Persist to Google Sheets Backend
    if (user?._id) {
      const selectedLabels = updatedOptions.map(idx => q.options[idx]?.text).join(', ');
      api.post('/state/exam/save', {
        userId: user._id,
        examId: assessmentId,
        questionId: questionId,
        selectedAnswer: updatedOptions,
        answerLabel: selectedLabels
      }).catch(err => console.error('Failed to sync answer state', err));
    }
  };

  // Safe Guard: Return loading if authentication state is not loaded yet
  if (!user) {
    return <div className="loading-center"><div className="loading-spinner" /></div>;
  }

  // SETUP PHASE
  if (phase === 'setup') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Shield size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{assessment?.title}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{assessment?.description}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
            <div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-light)' }}>{questions.length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Questions</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-light)' }}>{assessment?.duration}m</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Duration</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-light)' }}>{assessment?.passingScore}%</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pass Score</div></div>
          </div>
          <div className="alert alert-warning" style={{ textAlign: 'left', marginBottom: 24, fontSize: 13 }}>
            <AlertTriangle size={16} />
            <div>
              <strong>Rules:</strong> No tab switching, no copy/paste, no right-click. Webcam required.
              Max {maxViolations} violations before auto-submit.
            </div>
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setPhase('webcam'); }}>
            Continue to Webcam Setup <ChevronRight size={18} />
          </button>
        </motion.div>
      </div>
    );
  }

  // WEBCAM PHASE
  if (phase === 'webcam') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: 40 }}>
          <Camera size={36} color="var(--primary-light)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Webcam Verification</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Ensure your face is clearly visible</p>

          {/* Video preview with loading/error overlays */}
          <div style={{ position: 'relative', width: '100%', height: 260, borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 20, border: `2px solid ${cameraError ? '#ef4444' : webcamReady ? '#10b981' : 'var(--border)'}` }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />

            {/* Loading spinner overlay */}
            {cameraLoading && !webcamReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
                <Loader2 size={36} color="#818cf8" className="animate-spin" />
                <span style={{ color: '#a5b4fc', fontSize: 13, marginTop: 12, fontWeight: 500 }}>Initializing camera...</span>
              </div>
            )}

            {/* Error overlay */}
            {cameraError && !cameraLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 20 }}>
                <XCircle size={36} color="#ef4444" />
                <span style={{ color: '#fca5a5', fontSize: 13, marginTop: 12, fontWeight: 500, lineHeight: 1.5, textAlign: 'center' }}>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Status indicator */}
          {webcamReady && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 13, color: '#10b981', fontWeight: 500 }}>Webcam Active — Ready to start</span>
            </div>
          )}

          {/* Retry button when camera fails */}
          {cameraError && !cameraLoading && (
            <button
              className="btn btn-lg"
              onClick={() => { setWebcamReady(false); startWebcam(); }}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 12, background: 'transparent', border: '2px solid var(--primary)', color: 'var(--primary)', borderRadius: 12, padding: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Camera size={16} style={{ marginRight: 8 }} /> Retry Camera
            </button>
          )}

          <button className="btn btn-primary btn-lg" disabled={!webcamReady || cameraLoading} style={{ width: '100%', justifyContent: 'center' }} onClick={startExam}>
            {cameraLoading ? <><Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} /> Checking Camera...</> : <>Start Exam <ChevronRight size={18} /></>}
          </button>
        </motion.div>
      </div>
    );
  }



  // EXAM PHASE
  const question = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;
  // const totalTime = assessment?.timePerQuestion || 30; // removed unused variable
  const timerColor = timer <= 10 ? '#ef4444' : timer <= 20 ? '#f59e0b' : '#10b981';
  const hasAnswer = (answers[question?._id]?.selectedOptions?.length || 0) > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', userSelect: 'none', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={20} color="var(--primary-light)" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>{assessment?.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-light)' }}>Q {currentQ + 1}/{questions.length}</span>
          <span className={`badge ${violations > 0 ? 'badge-danger' : 'badge-muted'}`} style={{ padding: '6px 12px', fontSize: 12 }}>
            <AlertTriangle size={14} /> {violations}/{maxViolations} Violations
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-bar" style={{ height: 4, borderRadius: 0 }}>
        <div className="progress-fill" style={{ width: `${progress}%`, transition: 'width 0.3s' }} />
      </div>

      {/* Main Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32, padding: '32px', flex: 1, alignItems: 'start' }}>

        {/* Left Side: Live Monitoring Panel */}
        <div className="card" style={{ padding: 20, position: 'sticky', top: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
            <Camera size={16} className="text-primary-light" /> Live Monitoring
          </h3>

          <div style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 20, border: '2px solid var(--border)' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Face Detection</span>
              <span className="badge badge-success" style={{ fontSize: 10 }}>ACTIVE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Screen Activity</span>
              <span className="badge badge-success" style={{ fontSize: 10 }}>MONITORING</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Tab Switching</span>
              <span className="badge badge-success" style={{ fontSize: 10 }}>DETECTING</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Connection Status</span>
              <span className="badge badge-success" style={{ fontSize: 10 }}>STABLE</span>
            </div>
          </div>
        </div>

        {/* Right Side: Question Area */}
        <div className="card" style={{ padding: 40 }}>
          {/* Timer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-secondary)', padding: '8px 24px', borderRadius: 30, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>TIME REMAINING:</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(timer)}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {/* Question Header */}
              <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className={`badge ${question?.difficulty === 'easy' ? 'badge-success' : question?.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`}>{question?.difficulty}</span>
                <span className="badge badge-primary">{question?.marks} marks</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                {question?.title}
              </h2>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {question?.options?.map((opt, idx) => {
                  const selected = answers[question._id]?.selectedOptions?.includes(idx);
                  return (
                    <motion.button key={idx} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelect(question._id, idx)}
                      style={{
                        width: '100%', padding: '18px 24px', borderRadius: 12, cursor: 'pointer',
                        background: selected ? 'rgba(99,102,241,0.15)' : 'var(--bg-secondary)',
                        border: `2px solid ${selected ? 'var(--primary)' : 'transparent'}`,
                        color: selected ? 'var(--primary-light)' : 'var(--text-secondary)',
                        fontSize: 15, fontWeight: selected ? 600 : 500, textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s',
                        boxShadow: selected ? '0 4px 12px rgba(99,102,241,0.1)' : 'none'
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: question?.type === 'multiple-select' ? 6 : '50%',
                        border: `2px solid ${selected ? 'var(--primary)' : 'var(--text-muted)'}`,
                        background: selected ? 'var(--primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, color: selected ? '#fff' : 'var(--text-muted)',
                        flexShrink: 0,
                      }}>
                        {selected ? '✓' : String.fromCharCode(65 + idx)}
                      </div>
                      <span style={{ lineHeight: 1.4 }}>{opt.text}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 }}>
                <button
                  className="btn btn-lg"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={submitting}
                  style={{
                    background: 'transparent',
                    border: '2px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: 12,
                    padding: '10px 24px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.target.style.background = '#ef4444'; e.target.style.color = '#fff'; }}
                  onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#ef4444'; }}
                >
                  <XCircle size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Cancel Exam
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleNext} disabled={submitting || !hasAnswer}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> :
                    currentQ < questions.length - 1 ? <>Next Question <ChevronRight size={18} /></> : <>Submit Assessment</>}
                </button>
              </div>

              {/* Cancel Exam Confirmation Modal */}
              {showCancelConfirm && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 99999,
                }}>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      background: 'var(--card-bg, #fff)', borderRadius: 20, padding: 36,
                      maxWidth: 440, width: '90%', textAlign: 'center',
                      boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: 'rgba(239,68,68,0.12)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}>
                      <AlertTriangle size={28} color="#ef4444" />
                    </div>
                    <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: 'var(--text, #1a1a2e)' }}>
                      Are you sure you want to cancel the exam?
                    </h3>
                    <p style={{ margin: '0 0 28px', color: 'var(--text-muted, #64748b)', fontSize: 14, lineHeight: 1.6 }}>
                      Your progress will be saved but the exam will be marked as <strong>Cancelled</strong>.
                      You will be redirected to the employee dashboard.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        style={{
                          padding: '12px 28px', borderRadius: 12, border: '2px solid var(--border, #e2e8f0)',
                          background: 'transparent', color: 'var(--text, #1a1a2e)',
                          fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        No, Continue Exam
                      </button>
                      <button
                        onClick={() => { setShowCancelConfirm(false); submitExamAutomatically('User Cancelled Exam'); }}
                        style={{
                          padding: '12px 28px', borderRadius: 12, border: 'none',
                          background: '#ef4444', color: '#fff',
                          fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        Yes, Exit Exam
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
              
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
