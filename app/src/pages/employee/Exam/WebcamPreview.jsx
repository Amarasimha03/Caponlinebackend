import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, XCircle, ChevronRight } from 'lucide-react';

export function WebcamPreview({ videoRef, cameraLoading, cameraError, webcamReady, startWebcam, onStartExam }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: 40 }}>
        <Camera size={36} color="var(--primary-light)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Webcam Verification</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Ensure your face is clearly visible</p>

        <div style={{ position: 'relative', width: '100%', height: 260, borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 20, border: `2px solid ${cameraError ? '#ef4444' : webcamReady ? '#10b981' : 'var(--border)'}` }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />

          {cameraLoading && !webcamReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
              <Loader2 size={36} color="#818cf8" className="animate-spin" />
              <span style={{ color: '#a5b4fc', fontSize: 13, marginTop: 12, fontWeight: 500 }}>Initializing camera...</span>
            </div>
          )}

          {cameraError && !cameraLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 20 }}>
              <XCircle size={36} color="#ef4444" />
              <span style={{ color: '#fca5a5', fontSize: 13, marginTop: 12, fontWeight: 500, lineHeight: 1.5, textAlign: 'center' }}>{cameraError}</span>
            </div>
          )}
        </div>

        {webcamReady && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 500 }}>Webcam Active - Ready to start</span>
          </div>
        )}

        {cameraError && !cameraLoading && (
          <button
            className="btn btn-lg"
            onClick={startWebcam}
            style={{ width: '100%', justifyContent: 'center', marginBottom: 12, background: 'transparent', border: '2px solid var(--primary)', color: 'var(--primary)', borderRadius: 12, padding: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Camera size={16} style={{ marginRight: 8 }} /> Retry Camera
          </button>
        )}

        <button className="btn btn-primary btn-lg" disabled={cameraLoading} style={{ width: '100%', justifyContent: 'center' }} onClick={onStartExam}>
          {cameraLoading ? <><Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} /> Preparing Camera...</> : <>Start Exam <ChevronRight size={18} /></>}
        </button>
      </motion.div>
    </div>
  );
}
