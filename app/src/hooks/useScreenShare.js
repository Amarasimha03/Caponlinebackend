import { useState, useRef, useCallback } from 'react';

export function useScreenShare() {
  const [screenReady, setScreenReady] = useState(false);
  const [screenError, setScreenError] = useState('');
  
  const screenStreamRef = useRef(null);

  const startScreenShare = useCallback(async (onStopCallback) => {
    try {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      
      // Attempt to enforce full screen sharing if possible
      const settings = videoTrack.getSettings();
      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        videoTrack.stop();
        throw new Error('Please share your entire screen, not just a window or tab.');
      }
      
      videoTrack.onended = () => {
        setScreenReady(false);
        if (onStopCallback) onStopCallback('Screen Share Stopped');
      };

      screenStreamRef.current = stream;
      setScreenReady(true);
      setScreenError('');
      
      return stream;
    } catch (err) {
      setScreenError(err.message || 'Screen share failed or was denied.');
      return null;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        track.onended = null;
        track.stop();
      });
      screenStreamRef.current = null;
    }
    setScreenReady(false);
  }, []);

  return { screenStreamRef, screenReady, screenError, startScreenShare, stopScreenShare };
}
