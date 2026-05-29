import { useEffect, useMemo } from 'react';
import api from '../services/api';
import debounce from 'lodash.debounce';

export function useAutoSave({ LS_EXAM_KEY, phase, currentQ, timer, resultId, violations, answers, assessmentId, user }) {
  
  const saveExamState = useMemo(
    () => debounce((snapshot, userId, examId) => {
      localStorage.setItem(snapshot.LS_EXAM_KEY, JSON.stringify(snapshot));
      if (userId) {
        api.post('/state/exam/meta/save', {
          userId,
          examId,
          phase: snapshot.phase,
          currentQ: snapshot.currentQ,
          timer: snapshot.timer,
          resultId: snapshot.resultId,
          violations: snapshot.violations
        }).catch(() => {});
      }
    }, 2000), // 2 second debounce
    []
  );

  useEffect(() => {
    if (phase !== 'setup' && phase !== 'submitted') {
      const snapshot = { LS_EXAM_KEY, assessmentId, phase, currentQ, timer, resultId, violations, answers };
      saveExamState(snapshot, user?._id, assessmentId);
    }
    
    if (phase === 'submitted') {
      localStorage.removeItem(LS_EXAM_KEY);
      saveExamState.cancel();
    }
  }, [phase, currentQ, timer, resultId, violations, assessmentId, user, answers, LS_EXAM_KEY, saveExamState]);
}
