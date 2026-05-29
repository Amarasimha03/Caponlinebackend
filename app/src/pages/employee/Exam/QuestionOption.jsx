import React from 'react';
import { motion } from 'framer-motion';

export const QuestionOption = React.memo(({ opt, idx, selected, questionType, onSelect }) => (
  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
    onClick={() => onSelect(idx)}
    style={{
      width: '100%', padding: '18px 24px', borderRadius: 12, cursor: 'pointer',
      background: selected ? 'rgba(99,102,241,0.15)' : 'var(--bg-secondary)',
      border: `2px solid ${selected ? 'var(--primary)' : 'transparent'}`,
      color: selected ? 'var(--primary-light)' : 'var(--text-secondary)',
      fontSize: 15, fontWeight: selected ? 600 : 500, textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s',
      boxShadow: selected ? '0 4px 12px rgba(99,102,241,0.1)' : 'none'
    }}
  >
    <div style={{
      width: 28, height: 28, borderRadius: questionType === 'multiple-select' ? 6 : '50%',
      border: `2px solid ${selected ? 'var(--primary)' : 'var(--text-muted)'}`,
      background: selected ? 'var(--primary)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, color: selected ? '#fff' : 'var(--text-muted)',
      flexShrink: 0,
    }}>
      {selected ? '✓' : String.fromCharCode(65 + idx)}
    </div>
    <span style={{ lineHeight: 1.4 }}>{opt.text}</span>
  </motion.button>
));
