import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, LogIn } from 'lucide-react';

export default function ExamTerminatedPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card"
        style={{
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
          padding: 48,
          border: '1px solid rgba(239, 68, 68, 0.2)',
          boxShadow: '0 10px 50px -10px rgba(239, 68, 68, 0.15)'
        }}
      >
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <ShieldAlert size={32} color="#ef4444" />
        </div>
        
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: '#f87171' }}>
          Exam Terminated
        </h2>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6, fontSize: 15 }}>
          Your assessment has been automatically submitted and terminated due to multiple camera violations. You have been automatically logged out for security purposes.
        </p>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', gap: 10 }}
          onClick={() => navigate('/login')}
        >
          <LogIn size={18} />
          Return to Login
        </button>
      </motion.div>
    </div>
  );
}
