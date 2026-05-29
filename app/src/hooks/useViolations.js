import { useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

export function useViolations({ phase, user, assessmentId, resultId, violations, setViolations, maxViolations = 3, socketRef, onTerminate }) {
  const tabSwitchWarningsRef = useRef(0);

  const logViolation = useCallback(async (type, description, customTerminationReason = null) => {
    setViolations(prev => {
      const newCount = prev + 1;
      toast.error(`⚠️ Violation: ${description}`, { duration: 3000 });
      
      // Emit specification socket violation event
      socketRef.current?.emit('violation', {
        examId: assessmentId,
        userId: user?._id,
        type: String(type).toUpperCase() === 'TAB-SWITCH' ? 'TAB_SWITCH' : String(type).toUpperCase()
      });

      socketRef.current?.emit('violation:detected', {
        employeeId: user?._id, employeeName: user?.fullName,
        assessmentId, type, description,
      });

      api.post('/violations', {
        assessmentId, resultId, type, description, severity: 'medium',
      }).then(({ data }) => {
        if (data.autoSubmit || newCount >= maxViolations || customTerminationReason) {
          const reason = customTerminationReason || `Terminated - Maximum Violations Reached`;
          toast.error(reason, { duration: 5000 });
          onTerminate(reason);
        }
      }).catch(() => {});
      
      return newCount;
    });
  }, [user, assessmentId, resultId, maxViolations, socketRef, onTerminate]);

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

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [phase, logViolation]);

  return { violations, setViolations, logViolation };
}
