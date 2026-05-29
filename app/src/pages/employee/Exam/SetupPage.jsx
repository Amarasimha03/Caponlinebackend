import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, ChevronRight } from 'lucide-react';

export function SetupPage({ assessment, questionsCount, maxViolations, onStart }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Shield size={32} color="#fff" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{assessment?.title}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{assessment?.description}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
          <div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-light)' }}>{questionsCount}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Questions</div></div>
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
        <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={onStart}>
          Start Assessment <ChevronRight size={18} />
        </button>
      </motion.div>
    </div>
  );
}
