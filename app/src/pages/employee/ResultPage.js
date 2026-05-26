import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, Clock, ArrowLeft, CheckCircle, XCircle, Copy, Download, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function ResultPage() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const showAnswers = true;
  const [rankList, setRankList] = useState([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/results/${resultId}`);
        if (!data.success || !data.result) {
          toast.error('No result available');
          navigate('/dashboard');
          return;
        }

        setResult(data.result);

        // Fetch ranks if assessment is available
        if (data.result.assessment?._id) {
          try {
            const rankRes = await api.get(`/results/rank/${data.result.assessment._id}`);
            if (rankRes.data.success) {
              setRankList(rankRes.data.rankList || []);
            }
          } catch (e) {
            console.error('Failed to load rank list', e);
          }
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'No result available';
        toast.error(msg);
        navigate('/dashboard');
      }
      setLoading(false);
    })();
  }, [resultId, navigate]);

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;
  if (!result) {
    return (
      <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
        <ShieldAlert size={48} color="var(--danger)" />
        <h3>No result available</h3>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: 20 }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Answer counting logic
  const totalQuestions = result.answers?.length || 0;
  const correctCount = result.answers?.filter(a => a.isCorrect).length || 0;
  const wrongCount = result.answers?.filter(a => !a.isCorrect && a.selectedOptions && a.selectedOptions.length > 0).length || 0;
  const unansweredCount = result.answers?.filter(a => !a.selectedOptions || a.selectedOptions.length === 0).length || 0;

  // Rank finding logic
  const myRankItem = rankList.find(r => r._id === result._id);
  const rank = myRankItem ? myRankItem.rank : '—';

  // Copy results function
  const handleCopyResult = () => {
    const text = `
🏆 Exam Result: ${result.assessment?.title}
👤 Candidate: ${result.employee?.fullName}
📊 Score: ${result.totalScore}/${result.totalMarks} (${result.percentage}%)
🎯 Status: ${result.passed ? 'PASSED' : 'FAILED'}
⏱️ Time taken: ${result.completionTime || 0} mins
🎖️ Rank: ${rank}
    `.trim();
    navigator.clipboard.writeText(text);
    toast.success('Result summary copied to clipboard');
  };

  // Mock download PDF function (opens print preview window configured nicely)
  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="animate-fade" style={{ paddingBottom: 60 }}>
      {/* Action panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopyResult}>
            <Copy size={14} /> Copy Summary
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF}>
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 840, margin: '0 auto', padding: 40, boxShadow: 'var(--shadow-lg)' }}>
        {/* Submitted metadata */}
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', marginBottom: -10 }}>
          Submitted on: {new Date(result.submittedAt || result.createdAt).toLocaleString()}
        </div>

        {/* Main Status & Score */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          {result.passed ? (
            <CheckCircle size={72} color="#10b981" style={{ margin: '0 auto 16px' }} />
          ) : (
            <XCircle size={72} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          )}
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            {result.assessment?.title}
          </h1>
          <span className={`badge ${result.passed ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 14, padding: '6px 16px' }}>
            {result.passed ? 'PASSED' : 'FAILED'}
          </span>
        </div>

        {/* Expanded Metric Statistics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginBottom: 36 }}>
          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
            <Award size={20} color="var(--primary-light)" />
            <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{result.percentage}%</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score ({result.totalScore}/{result.totalMarks})</p>
          </div>
          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
            <Clock size={20} color="var(--info)" />
            <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{result.completionTime || 0}m</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Duration ({result.assessment?.duration || 30}m max)</p>
          </div>
          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', marginTop: 4 }}>{correctCount}</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Correct Answers</p>
          </div>
          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>{wrongCount}</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Wrong Answers</p>
          </div>
          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#9ca3af', marginTop: 4 }}>{unansweredCount}</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Unanswered</p>
          </div>

        </div>



        {/* Answer Keys Detailed Question Navigation View */}
        {showAnswers && result.answers && result.answers.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 30 }}>
            {/* Horizontal Question Index Bar */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
              {result.answers.map((ans, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveQuestionIndex(idx)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: activeQuestionIndex === idx ? 'var(--primary)' : ans.isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `2px solid ${activeQuestionIndex === idx ? 'var(--primary)' : ans.isCorrect ? '#10b981' : '#ef4444'}`,
                    color: activeQuestionIndex === idx ? '#fff' : ans.isCorrect ? '#10b981' : '#ef4444',
                    transition: 'all 0.2s'
                  }}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {/* Selected Active Question Display Container */}
            {(() => {
              const ans = result.answers[activeQuestionIndex];
              let q = ans?.question;

              // Extract pure string ID from ans.question
              const targetId = typeof q === 'object' && q !== null ? (q._id || q.id) : q;

              // Look it up inside result.assessment.questions
              if (result.assessment?.questions) {
                const found = result.assessment.questions.find(qst => {
                  const qstId = typeof qst === 'object' && qst !== null ? (qst._id || qst.id) : qst;
                  return String(qstId) === String(targetId);
                });
                if (found) {
                  q = found;
                }
              }

              if (!q || typeof q === 'string') return <p style={{ color: 'var(--text-muted)' }}>Question data unavailable.</p>;

              return (
                <div className="card animate-fade" style={{ background: 'var(--bg-secondary)', padding: 24, border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary-light)' }}>Question {activeQuestionIndex + 1} of {totalQuestions}</span>
                    <span className={`badge ${ans.isCorrect ? 'badge-success' : 'badge-danger'}`} style={{ padding: '4px 10px' }}>
                      {ans.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20, lineHeight: 1.5 }}>
                    {q.title || q.question || 'Question Details'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    {q.options?.map((opt, oi) => {
                      const isSelected = ans.selectedOptions?.map(Number).includes(Number(oi));
                      const isCorrect = opt.isCorrect;

                      let border = '1px solid var(--border-light)';
                      let bg = 'var(--bg-card)';
                      let badge = null;

                      if (isCorrect) {
                        border = '2px solid #10b981';
                        bg = 'rgba(16,185,129,0.08)';
                        badge = <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#10b981' }}>✓ CORRECT ANSWER</span>;
                      } else if (isSelected && !isCorrect) {
                        border = '2px solid #ef4444';
                        bg = 'rgba(239,68,68,0.08)';
                        badge = <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#ef4444' }}>✗ YOUR SELECTION</span>;
                      }

                      return (
                        <div key={oi} style={{
                          padding: '14px 20px', borderRadius: 10, fontSize: 14,
                          background: bg, border: border,
                          display: 'flex', alignItems: 'center', gap: 12
                        }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--text-muted)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: isSelected ? '#fff' : 'var(--text-muted)'
                          }}>
                            {String.fromCharCode(65 + oi)}
                          </div>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{opt.text}</span>
                          {badge}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Section */}
                  {q.explanation && (
                    <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 10, borderLeft: '4px solid var(--primary)' }}>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Explanation:</h4>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>{q.explanation}</p>
                    </div>
                  )}

                  {/* Simple inner card prev/next */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={activeQuestionIndex === 0}
                      onClick={() => setActiveQuestionIndex(activeQuestionIndex - 1)}
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={activeQuestionIndex === totalQuestions - 1}
                      onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
