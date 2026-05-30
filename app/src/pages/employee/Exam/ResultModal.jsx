import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Award, ArrowRight, Home, BarChart3, Clock, Target, AlertTriangle } from 'lucide-react';

// Animated counter hook
function useAnimatedCounter(target, duration = 1200, active = false) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration, active]);

  return value;
}

// Simple confetti particle system
function ConfettiEffect({ active }) {
  if (!active) return null;
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.8 + Math.random() * 1.2,
    size: 4 + Math.random() * 6,
    color: ['#10b981', '#6366f1', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 6)],
    rotation: Math.random() * 360,
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}%`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: '120vh', opacity: [1, 1, 0], rotate: p.rotation + 360, scale: [1, 0.8, 0.5] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

export function ResultModal({ show, result, onViewDetails, onDashboard }) {
  const [animateScore, setAnimateScore] = useState(false);

  const percentage = result?.percentage ?? 0;
  const passed = result?.passed ?? false;
  const totalScore = result?.totalScore ?? 0;
  const totalMarks = result?.totalMarks ?? 0;
  const correctCount = result?.correctCount ?? 0;
  const wrongCount = result?.wrongCount ?? 0;
  const unansweredCount = result?.unansweredCount ?? 0;
  // eslint-disable-next-line no-unused-vars
  const totalQuestions = result?.totalQuestions ?? 0;

  const animatedPercent = useAnimatedCounter(percentage, 1500, animateScore);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setAnimateScore(true), 400);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const scoreColor = passed ? '#10b981' : '#ef4444';


  // SVG circle animation
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * animatedPercent) / 100;

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
      >
        <ConfettiEffect active={passed && animateScore} />

        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: 520,
            background: 'rgba(18, 20, 31, 0.95)',
            backdropFilter: 'blur(24px)',
            border: `1px solid ${passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
          }}
        >
          {/* Top banner */}
          <div style={{
            padding: '32px 32px 20px',
            background: passed
              ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))'
              : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))',
            textAlign: 'center',
            borderBottom: `1px solid ${passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
          }}>
            {/* Animated icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: 16 }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto',
                background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                boxShadow: `0 0 30px ${passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                {passed
                  ? <Award size={32} color="#10b981" />
                  : <AlertTriangle size={32} color="#ef4444" />
                }
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6 }}
            >
              {passed ? 'Congratulations! 🎉' : 'Exam Completed'}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{ fontSize: 14, color: 'var(--text-secondary)' }}
            >
              {passed ? 'You have successfully passed the assessment!' : 'Unfortunately, you did not meet the passing criteria.'}
            </motion.p>
          </div>

          {/* Score circle */}
          <div style={{ padding: '28px 32px', textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              style={{ position: 'relative', width: 170, height: 170, margin: '0 auto 20px' }}
            >
              <svg width="170" height="170" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle cx="85" cy="85" r={radius} fill="none"
                  stroke="rgba(255,255,255,0.06)" strokeWidth="10"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="85" cy="85" r={radius} fill="none"
                  stroke={scoreColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: strokeDashoffset }}
                  transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ filter: `drop-shadow(0 0 8px ${scoreColor}40)` }}
                />
              </svg>
              {/* Center text */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 42, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                  {animatedPercent}%
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                  {totalScore}/{totalMarks} points
                </span>
              </div>
            </motion.div>

            {/* Pass/Fail badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 20px', borderRadius: 99,
                background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                marginBottom: 24,
              }}
            >
              {passed ? <CheckCircle size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
              <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor, letterSpacing: '0.05em' }}>
                {passed ? 'PASSED' : 'FAILED'}
              </span>
            </motion.div>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12, marginBottom: 28,
              }}
            >
              <div style={{
                background: 'rgba(16,185,129,0.08)', borderRadius: 12, padding: '14px 8px',
                border: '1px solid rgba(16,185,129,0.15)',
              }}>
                <Target size={18} color="#10b981" style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{correctCount}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Correct</div>
              </div>
              <div style={{
                background: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: '14px 8px',
                border: '1px solid rgba(239,68,68,0.15)',
              }}>
                <XCircle size={18} color="#ef4444" style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{wrongCount}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Wrong</div>
              </div>
              <div style={{
                background: 'rgba(245,158,11,0.08)', borderRadius: 12, padding: '14px 8px',
                border: '1px solid rgba(245,158,11,0.15)',
              }}>
                <Clock size={18} color="#f59e0b" style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{unansweredCount}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Unanswered</div>
              </div>
            </motion.div>

            {/* Performance summary bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              style={{ marginBottom: 28 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Performance</span>
                <span style={{ fontSize: 12, color: scoreColor, fontWeight: 700 }}>{animatedPercent}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: '100%', borderRadius: 99,
                    background: passed
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #ef4444, #f87171)',
                    boxShadow: `0 0 12px ${scoreColor}40`,
                  }}
                />
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              style={{ display: 'flex', gap: 12 }}
            >
              <button
                onClick={onDashboard}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 20px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                <Home size={16} /> Dashboard
              </button>
              <button
                onClick={onViewDetails}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 20px', borderRadius: 12,
                  background: passed
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: `0 4px 20px ${passed ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${passed ? 'rgba(16,185,129,0.45)' : 'rgba(99,102,241,0.45)'}`;}}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 20px ${passed ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`;}}
              >
                <BarChart3 size={16} /> View Details <ArrowRight size={14} />
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
