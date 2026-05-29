import React, { useState } from 'react';
import { Shield, AlertTriangle, XCircle, ChevronRight, Loader2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MonitoringPanel } from './MonitoringPanel';
import { QuestionDisplay } from './QuestionDisplay';

export function ExamLayout({
  assessment, questionsCount, currentQ, violations, maxViolations,
  videoRef, streamRef, question, answers, handleSelect, handleNext, submitting, submitExamAutomatically,
  timer
}) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const progress = ((currentQ + 1) / questionsCount) * 100;
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
          {timer !== undefined && (
            <span style={{ 
              fontSize: 13, fontWeight: 800, color: timer <= 10 ? '#ef4444' : 'var(--text-primary)', 
              background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: 8, 
              border: `1.5px solid ${timer <= 10 ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: timer <= 10 ? '0 0 10px rgba(239,68,68,0.2)' : 'none'
            }}>
              <Clock size={14} className={timer <= 10 ? "animate-pulse" : ""} />
              <span>{timer}s left</span>
            </span>
          )}
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-light)' }}>Q {currentQ + 1}/{questionsCount}</span>
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

        <MonitoringPanel videoRef={videoRef} streamRef={streamRef} />

        <div className="card" style={{ padding: 40 }}>
          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <QuestionDisplay 
                question={question} 
                selectedOptions={answers[question?._id]?.selectedOptions || []} 
                onSelect={handleSelect} 
              />

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
                    currentQ < questionsCount - 1 ? <>Next Question <ChevronRight size={18} /></> : <>Submit Assessment</>}
                </button>
              </div>

              {showCancelConfirm && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 99999,
                }}>
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ padding: 32, maxWidth: 400, width: '100%', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <AlertTriangle size={32} color="#E24B4A" />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>Cancel Exam?</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                      Are you sure you want to cancel? All your progress will be lost and this will be recorded as a cancelled attempt.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button className="btn" onClick={() => setShowCancelConfirm(false)} style={{ flex: 1, background: '#F1EFE8', color: '#2C2C2A' }}>Keep Playing</button>
                      <button className="btn" onClick={() => { setShowCancelConfirm(false); submitExamAutomatically('User Cancelled Exam'); }} style={{ flex: 1, background: '#E24B4A', color: '#fff' }}>Yes, Cancel</button>
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
