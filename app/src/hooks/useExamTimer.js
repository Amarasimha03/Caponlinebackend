import { useState, useEffect, useRef } from 'react';

export function useExamTimer({ initialTimer = 1800, phase, currentQ, questionsCount, timePerQuestion, onTimeExpired, autoNextQ }) {
  const [timer, setTimer] = useState(initialTimer);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase !== 'exam') return;
    
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          const lastQIndex = questionsCount - 1;
          if (currentQ === lastQIndex) {
            onTimeExpired();
            clearInterval(timerRef.current);
            return 0;
          }
          autoNextQ();
          return timePerQuestion || 30;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timerRef.current);
  }, [phase, currentQ, questionsCount, timePerQuestion, onTimeExpired, autoNextQ]);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return { timer, setTimer, clearTimer };
}
