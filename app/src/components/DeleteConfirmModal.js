import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, title = "Delete Item", message = "Are you sure you want to delete this item?", loading = false }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ zIndex: 99999 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            style={{ maxWidth: 440, width: '90%', textAlign: 'center', padding: 32 }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '1px solid rgba(239,68,68,0.2)'
            }}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            
            <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
              {title}
            </h3>
            
            <p style={{ margin: '0 0 28px', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
              {message}
            </p>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
                style={{ padding: '10px 24px', minWidth: 100 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirm}
                disabled={loading}
                style={{
                  background: '#ef4444',
                  borderColor: '#ef4444',
                  color: '#fff',
                  padding: '10px 24px',
                  minWidth: 100,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                }}
              >
                {loading ? 'Deleting...' : <><Trash2 size={15} /> Delete</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
