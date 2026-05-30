import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Star, Calendar, CheckCircle, Play, Eye, BookOpen } from 'lucide-react';
import { normalizeBoolean } from '../../../utils/formatters';

const SkeletonRow = () => (
  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <td colSpan="7" style={{ padding: '20px 24px' }}>
      <div style={{ height: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 4, width: '60%' }} />
    </td>
  </tr>
);

const getQuestionCount = (questions) => {
  if (Array.isArray(questions)) return questions.length;
  if (typeof questions === 'string') {
    try { return JSON.parse(questions).length; } catch { return 0; }
  }
  return 0;
};

// ✅ Google Sheets returns examCompleted as the string "true", not boolean
const isExamDone = (a) =>
  a.status === 'completed' ||
  a.result?.status === 'submitted' ||
  a.result?.status === 'auto-submitted' ||
  a.result?.status === 'completed' ||
  String(a.result?.examCompleted).toLowerCase() === 'true';

export function MyExamsTable({ loading, assessments, handleViewResult }) {
  const navigate = useNavigate();

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={22} color="var(--primary)" /> My Exams
        </h2>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Exam Name', 'Questions', 'Duration', 'Pass Score', 'Assigned Date', 'Status', 'Action'].map((h) => (
                  <th key={h} style={{
                    padding: '14px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                    letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && assessments.length === 0 ? (
                [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
              ) : assessments.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No exams assigned to you yet.
                  </td>
                </tr>
              ) : (
                assessments.map((a, i) => (
                  <motion.tr
                    key={a._id ? `${a._id}-${i}` : i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.18 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => {
                      if (isExamDone(a)) {
                        handleViewResult(a);
                      } else {
                        navigate(`/exam/${a._id}`);
                      }
                    }}
                  >
                    <td style={{ padding: '20px 24px', minWidth: 200 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>{a.title}</div>
                      {a.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {a.description.substring(0, 60)}{a.description.length > 60 ? '…' : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{
                        background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: 99,
                        fontSize: 12, fontWeight: 700, border: '1px solid rgba(99,102,241,0.25)'
                      }}>
                        {getQuestionCount(a.questions)} Qs
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Clock size={14} color="var(--text-muted)" /> {a.duration} min
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                        <Star size={14} /> {a.passingScore}%
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      {isExamDone(a) ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                          padding: '5px 12px', borderRadius: 99, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)'
                        }}>✓ Completed</span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                          padding: '5px 12px', borderRadius: 99, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)'
                        }}>⏳ Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      {isExamDone(a) ? (
                        <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleViewResult(a); }} style={{ background: 'transparent', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = '#10b981'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}>
                          <Eye size={14} /> View Result
                        </button>
                      ) : (
                        <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/exam/${a._id}`); }} style={{
                          background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                          display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                        }} onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = '#818cf8'; }}>
                          <Play size={14} /> Start
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CompletedResultsTable({ loading, completed, handleViewResult }) {
  if (!loading && completed.length === 0) return null;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckCircle size={20} color="var(--success)" /> Results Summary
      </h2>

      <div style={{
        background: 'rgba(15,20,30,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
        overflow: 'hidden', backdropFilter: 'blur(12px)', boxShadow: '0 8px 40px rgba(0,0,0,0.25)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['#', 'Exam Name', 'Date', 'Score', 'Progress', 'Status', 'Action'].map((h) => (
                  <th key={h} style={{
                    padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                    letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && completed.length === 0 ? (
                [...Array(3)].map((_, i) => <SkeletonRow key={`skel-result-${i}`} />)
              ) : (
                completed.map((a, i) => {
                  const passed = normalizeBoolean(a.result?.passed);
                  const pct = a.result?.percentage || 0;
                  const dateStr = a.result?.submittedAt || a.result?.createdAt
                    ? new Date(a.result.submittedAt || a.result.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })
                    : '—';

                  return (
                    <motion.tr
                      key={a._id ? `result-${a._id}-${i}` : `result-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.18 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, width: 40 }}>{i + 1}</td>
                      <td style={{ padding: '16px', minWidth: 160 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{a.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {a.duration} mins</span>
                          <span>• {getQuestionCount(a.questions)} questions</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)' }}>
                          <Calendar size={12} color="var(--text-muted)" /> {dateStr}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Final Score: {a.result?.percentage || 0}%
                        </div>
                      </td>
                      <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: passed ? '#10b981' : '#ef4444' }}>
                          {a.result?.totalScore || 0}
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>/{a.result?.totalMarks || 100}</span>
                        </span>
                      </td>
                      <td style={{ padding: '16px', minWidth: 130 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', minWidth: 70 }}>
                            <div style={{
                              height: '100%', width: `${pct}%`, borderRadius: 99,
                              background: passed ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                              transition: 'width 0.6s ease', boxShadow: passed ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(239,68,68,0.4)'
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: passed ? '#10b981' : '#ef4444', minWidth: 32 }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                          padding: '5px 12px', borderRadius: 99, background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                          color: passed ? '#10b981' : '#ef4444', border: `1px solid ${passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          letterSpacing: '0.03em', boxShadow: passed ? '0 0 10px rgba(16,185,129,0.15)' : 'none'
                        }}>
                          <CheckCircle size={12} />
                          {passed ? 'Completed' : 'Failed'}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => handleViewResult(a)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10,
                            background: 'transparent', color: '#10b981', border: '1.5px solid #10b981',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 0 12px rgba(16,185,129,0.2)'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = '0 0 20px rgba(16,185,129,0.45)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.boxShadow = '0 0 12px rgba(16,185,129,0.2)'; }}
                        >
                          <Eye size={14} /> View Details
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
