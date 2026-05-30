import React from 'react';
import { ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';

export function ResultHeader({
  navigate, employeeId, handleCopyResult,
  passed, scorePercent, exam, employee, submittedAt, formatDate,
}) {
  return (
    <div style={{
      background: passed ? '#d4edda' : '#fde8e8',
      padding: '18px 20px 16px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Score watermark */}
      <div style={{
        position: 'absolute', right: 20, top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 64, fontWeight: 700, lineHeight: 1,
        color: passed ? 'rgba(100,160,60,0.15)' : 'rgba(200,60,60,0.12)',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        {scorePercent}%
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate(employeeId ? '/admin/dashboard' : '/employee/dashboard')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 12, color: passed ? '#4a7a2a' : '#a03030',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginBottom: 14,
        }}
      >
        <ArrowLeft size={13} strokeWidth={2} />
        Back to dashboard
      </button>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Check icon box */}
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: passed ? '#3B6D11' : '#A32D2D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={20} color="#fff" strokeWidth={2} />
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: passed ? '#1a3a0a' : '#3a0a0a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {exam?.title ?? 'Assessment'}
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                background: passed ? '#3B6D11' : '#A32D2D',
                color: '#fff', letterSpacing: '.4px',
              }}>
                {passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: passed ? '#4a7a2a' : '#7a2a2a', marginTop: 2 }}>
              {employee?.name ?? '—'} · {employee?.department ?? employee?.dept ?? '—'}
            </div>
            <div style={{ fontSize: 12, color: passed ? '#4a7a2a' : '#7a2a2a', marginTop: 1 }}>
              {formatDate(submittedAt)}
            </div>
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopyResult}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, padding: '5px 11px', borderRadius: 8,
            border: `0.5px solid ${passed ? '#97C459' : '#F09595'}`,
            background: 'none',
            color: passed ? '#3B6D11' : '#791F1F',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Copy size={13} />
          Copy result
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 14 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: passed ? '#4a7a2a' : '#7a2a2a', marginBottom: 4,
        }}>
          <span>0%</span>
          <span>{scorePercent}% achieved</span>
          <span>100%</span>
        </div>
        <div style={{
          height: 6, borderRadius: 3,
          background: passed ? 'rgba(100,160,60,0.2)' : 'rgba(200,60,60,0.15)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${scorePercent}%`,
            background: passed ? '#3B6D11' : '#E24B4A',
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    </div>
  );
}