import { useState, useRef, useCallback } from 'react';
import api from '../services/api';

export function useCamera(user) {
  const [webcamReady, setWebcamReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraRequestingRef = useRef(false);

  const startWebcam = useCallback(async () => {
    if (cameraRequestingRef.current) return;
    cameraRequestingRef.current = true;
    setCameraLoading(true);
    setCameraError('');

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError('Camera access requires a secure HTTPS connection.');
      setCameraLoading(false);
      cameraRequestingRef.current = false;
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Your browser does not support camera access. Please use Chrome, Edge, or Firefox.');
      setCameraLoading(false);
      cameraRequestingRef.current = false;
      return;
    }

    try {
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
      } catch (videoOnlyErr) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      const bindStream = () => {
        if (videoRef.current) {
          if (videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream;
          }
          videoRef.current.play().catch(e => {
            if (e.name !== 'AbortError') console.warn('Video play() failed:', e);
          });
        }
      };
      bindStream();
      setTimeout(bindStream, 300);

      if (!stream.active) {
        setCameraError('Camera is not active. It may be blocked by another application (Zoom, Meet, Teams). Close them and retry.');
        setCameraLoading(false);
        cameraRequestingRef.current = false;
        return;
      }

      setWebcamReady(true);
      setCameraError('');
      if (user?._id) api.post('/state/monitor/save', { userId: user._id, cameraStatus: 'active' }).catch(() => {});
    } catch (err) {
      let errorMsg = 'Camera access failed. ';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera access denied. Please allow webcam permission in your browser settings and retry.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No webcam device found. Please connect a camera and retry.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is in use by another application. Please close Zoom/Meet/Teams and retry.';
      }
      setCameraError(errorMsg);
    } finally {
      setCameraLoading(false);
      cameraRequestingRef.current = false;
    }
  }, [user]);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.onended = null;
        track.stop();
      });
      streamRef.current = null;
    }
    setWebcamReady(false);
  }, []);

  return { videoRef, streamRef, webcamReady, setWebcamReady, cameraLoading, cameraError, startWebcam, stopWebcam };
}
