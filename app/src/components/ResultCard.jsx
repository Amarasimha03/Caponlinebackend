import React from 'react';
import { Eye, Calendar, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResultCard({ title, percentage, totalScore, totalMarks, passed, date, onViewResult }) {
  const statusColor = passed ? '#10b981' : '#ef4444';
  const statusBg = passed ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
  const borderStyle = passed ? '1px solid rgba(16,185,129,0.18)' : '1px solid rgba(239,68,68,0.18)';
  const dateStr = date ? new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : '—';

  return (
    <motion.div 
      className="card" 
      initial={{ opacity: 0, y: 6 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.2 }}
      style={{ 
        padding: '20px 22px', 
        borderTop: `4px solid ${statusColor}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div>
        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 15, marginBottom: 14, lineHeight: 1.4 }}>
          {title}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Score:</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {totalScore || 0} / {totalMarks || 0}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Percentage:</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: statusColor }}>{percentage || 0}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Status:</span>
            <span style={{ 
              fontSize: 11, 
              fontWeight: 700, 
              padding: '3px 10px', 
              borderRadius: '6px', 
              color: statusColor, 
              background: statusBg,
              border: borderStyle,
              letterSpacing: '0.04em'
            }}>
              {passed ? 'PASS' : 'FAIL'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Date:</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{dateStr}</span>
          </div>
        </div>
      </div>

      {onViewResult && (
        <button 
          className="btn btn-ghost btn-sm" 
          style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border-light)', padding: '8px 0' }} 
          onClick={onViewResult}
        >
          <Eye size={14} style={{ marginRight: 6 }} /> View Result
        </button>
      )}
    </motion.div>
  );
}
