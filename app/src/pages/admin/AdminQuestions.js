import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, ArrowLeft, CheckCircle, Upload, Sparkles, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import CopyButton from '../../components/CopyButton';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import socket from '../../services/socket';

const TYPES = ['mcq', 'multiple-select', 'true-false', 'coding'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function AdminQuestions() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [form, setForm] = useState({
    title: '', type: 'mcq', marks: 1, difficulty: 'medium',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }],
  });

  const load = useCallback(async () => {
    try {
      const [qRes, aRes] = await Promise.all([
        api.get(`/questions?assessmentId=${assessmentId}`),
        api.get(`/assessments/${assessmentId}`),
      ]);
      const sortedQ = (qRes.data.questions || []).sort((a, b) =>
        String(a.title || '').localeCompare(String(b.title || ''), undefined, { numeric: true, sensitivity: 'base' })
      );
      setQuestions(sortedQ);
      setAssessment(aRes.data.assessment);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, [assessmentId]);

  useEffect(() => {
    load();
    // Live Socket sync hook
    socket.on('db:sync', () => {
      console.log('📡 Real-time sync signal received: updating question list');
      load();
    });
    return () => {
      socket.off('db:sync');
    };
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/questions', { ...form, assessmentId, assessment: assessmentId });
      toast.success('Question added');
      setShowModal(false);
      setForm({ title: '', type: 'mcq', marks: 1, difficulty: 'medium', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const triggerDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/questions/${deleteTarget}`);
      toast.success('Question permanently deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Failed to delete question');
    }
    setDeleteLoading(false);
  };

  const updateOption = (idx, field, value) => {
    const opts = [...form.options];
    if (field === 'isCorrect' && form.type === 'mcq') {
      opts.forEach((o, i) => o.isCorrect = i === idx);
    } else {
      opts[idx] = { ...opts[idx], [field]: value };
    }
    setForm({ ...form, options: opts });
  };

  // Upload Document and Automatically Generate MCQs
  const handleAutoGenerateUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.txt';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsGenerating(true);
      const reader = new FileReader();
      const isTxt = file.name.toLowerCase().endsWith('.txt');

      reader.onload = async (ev) => {
        try {
          let fileContent = '';
          if (isTxt) {
            fileContent = ev.target.result;
          } else {
            // Convert to base64
            fileContent = ev.target.result.split(',')[1];
          }

          toast.loading('Analyzing document and generating high-quality MCQs...', { id: 'mcq-gen' });

          const response = await api.post('/questions/generate', {
            fileName: file.name,
            fileContent: fileContent
          });

          toast.dismiss('mcq-gen');

          if (response.data.success && response.data.questions.length > 0) {
            toast.success(`Generated ${response.data.questions.length} questions from ${file.name}!`);
            setGeneratedQuestions(response.data.questions);
            setShowAutoGenerateModal(true);
          } else {
            toast.error('Could not generate questions. Try a different document.');
          }
        } catch (err) {
          toast.dismiss('mcq-gen');
          toast.error(err.response?.data?.message || 'Failed to process document');
        } finally {
          setIsGenerating(false);
        }
      };

      if (isTxt) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleUpdateGeneratedQuestion = (idx, field, value) => {
    const list = [...generatedQuestions];
    list[idx] = { ...list[idx], [field]: value };
    setGeneratedQuestions(list);
  };

  const handleDeleteGeneratedQuestion = (idx) => {
    const list = generatedQuestions.filter((_, i) => i !== idx);
    setGeneratedQuestions(list);
  };

  const handleSaveGeneratedQuestions = async () => {
    if (generatedQuestions.length === 0) {
      toast.error('No questions to save');
      return;
    }

    // Validate that each question has exactly one correct answer and non-empty options
    for (let i = 0; i < generatedQuestions.length; i++) {
      const q = generatedQuestions[i];
      if (!q.title.trim()) {
        toast.error(`Question ${i + 1} title cannot be empty`);
        return;
      }
      const correctCount = q.options.filter(o => o.isCorrect).length;
      if (correctCount === 0) {
        toast.error(`Please select a correct answer for Question ${i + 1}`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          toast.error(`Option ${j + 1} of Question ${i + 1} cannot be empty`);
          return;
        }
      }
    }

    try {
      toast.loading('Saving questions to assessment...', { id: 'save-mcq' });
      await api.post('/questions/bulk', {
        questions: generatedQuestions,
        assessmentId
      });
      toast.dismiss('save-mcq');
      toast.success('Successfully saved all generated questions!');
      setShowAutoGenerateModal(false);
      load();
    } catch {
      toast.dismiss('save-mcq');
      toast.error('Failed to save questions');
    }
  };
// Update generated question option
const handleUpdateGeneratedOption = (qIdx, oIdx, field, value) => {
  const list = [...generatedQuestions];
  const opts = [...list[qIdx].options];
  if (field === 'isCorrect') {
    opts.forEach((o, i) => { o.isCorrect = i === oIdx; });
  } else {
    opts[oIdx] = { ...opts[oIdx], [field]: value };
  }
  list[qIdx].options = opts;
  setGeneratedQuestions(list);
};
// Update generated question difficulty
const handleUpdateGeneratedDifficulty = (qIdx, diff) => {
  const list = [...generatedQuestions];
  const marks = diff === 'easy' ? 1 : diff === 'medium' ? 2 : 3;
  list[qIdx] = { ...list[qIdx], difficulty: diff, marks };
  setGeneratedQuestions(list);
};
// Update generated question marks
const handleUpdateGeneratedMarks = (qIdx, marksValue) => {
  const list = [...generatedQuestions];
  list[qIdx] = { ...list[qIdx], marks: marksValue };
  setGeneratedQuestions(list);
};

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div>
      <div className="page-header-row">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/assessments')} style={{ marginBottom: 8 }}>
            <ArrowLeft size={16} /> Back to Assessments
          </button>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1>Questions: {assessment?.title}</h1>
            <p>{questions.length} questions • {assessment?.duration} min duration</p>
          </div>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={handleAutoGenerateUpload}
            disabled={isGenerating}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Import Document
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} /> Add Question</button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        {questions.map((q, i) => (
          <motion.div key={q._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="card" style={{ marginBottom: 12, padding: '18px 24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-light)', minWidth: 28 }}>Q{i + 1}</span>
                  <span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`}>{q.difficulty}</span>
                  <span className="badge badge-primary">{q.type}</span>
                  <span className="badge badge-info">{q.marks} marks</span>
                  <CopyButton text={`Question:\n${q.title}\n\nOptions:\n${q.options?.map((o, idx) => `${String.fromCharCode(65 + idx)}) ${o.text}${o.isCorrect ? ' (Correct)' : ''}`).join('\n')}\n\nMarks: ${q.marks}`} />
                </div>
                <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 10 }}>{q.title}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {q.options?.map((opt, oi) => (
                    <div key={oi} style={{
                      padding: '8px 12px', borderRadius: 8, fontSize: 13,
                      background: opt.isCorrect ? 'rgba(16,185,129,0.1)' : 'var(--bg-surface)',
                      border: `1px solid ${opt.isCorrect ? 'rgba(16,185,129,0.3)' : 'var(--border-light)'}`,
                      color: opt.isCorrect ? '#6ee7b7' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      {opt.isCorrect && <CheckCircle size={14} />}
                      {opt.text}
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => triggerDelete(q._id)}>
                <Trash2 size={15} color="var(--danger)" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {questions.length === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <h3>No questions yet</h3>
          <p>Add questions manually, import JSON, or generate with AI using Upload Document!</p>
        </div>
      )}

      {/* Manual Add Question Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
            <motion.div className="modal" style={{ maxWidth: 620 }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Add Question</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Question</label>
                  <textarea className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required rows={2} placeholder="Enter the question..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-input form-select" value={form.type} onChange={e => {
                      const type = e.target.value;
                      let options = form.options;
                      if (type === 'true-false') options = [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }];
                      else if (options.length < 4) options = [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }];
                      setForm({ ...form, type, options });
                    }}>
                      {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select className="form-input form-select" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Marks</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Min: 1, Max: 100</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 5, 10].map(m => (
                      <button
                        key={m}
                        type="button"
                        className="btn"
                        style={{
                          padding: '6px 14px',
                          fontSize: 12,
                          background: form.marks === m ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                          color: form.marks === m ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${form.marks === m ? 'var(--primary)' : 'var(--border-light)'}`,
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: form.marks === m ? 600 : 400,
                          transition: 'all 0.2s',
                        }}
                        onClick={() => setForm({ ...form, marks: m })}
                      >
                        {m} {m === 1 ? 'Mark' : 'Marks'}
                      </button>
                    ))}
                  </div>
                  <input className="form-input" type="number" value={form.marks} onChange={e => {
                    const val = Math.max(1, Math.min(100, +e.target.value));
                    setForm({ ...form, marks: val });
                  }} min={1} max={100} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Options (check correct answers)</label>
                  {form.options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <input type={form.type === 'multiple-select' ? 'checkbox' : 'radio'} name="correct"
                        checked={opt.isCorrect} onChange={() => updateOption(i, 'isCorrect', !opt.isCorrect)}
                        style={{ accentColor: 'var(--primary)' }} />
                      <input className="form-input" value={opt.text} onChange={e => updateOption(i, 'text', e.target.value)}
                        placeholder={`Option ${i + 1}`} style={{ flex: 1, marginBottom: 0 }}
                        required disabled={form.type === 'true-false'} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Question</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto MCQ Review and Edit Modal */}
      <AnimatePresence>
        {showAutoGenerateModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 1000 }} onClick={() => setShowAutoGenerateModal(false)}>
            <motion.div
              className="modal"
              style={{ maxWidth: 850, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={20} color="#a855f7" />
                    <h3 className="modal-title">Review Generated MCQs</h3>
                  </div>
                  <button className="modal-close" onClick={() => setShowAutoGenerateModal(false)}><X size={20} /></button>
                </div>
                
                {/* One-click bulk change all marks */}
                {generatedQuestions.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    background: 'rgba(168,85,247,0.08)', 
                    padding: '8px 16px', 
                    borderRadius: 8, 
                    border: '1px dashed rgba(168,85,247,0.3)',
                    width: '100%',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#c084fc' }}>⚡ Bulk set all marks:</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 5, 10].map(m => {
                        const isActive = generatedQuestions.length > 0 && generatedQuestions.every(q => q.marks === m);
                        return (
                          <button
                            key={m}
                            type="button"
                            className="btn"
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                              color: isActive ? '#fff' : 'var(--text-primary)',
                              border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontWeight: isActive ? 600 : 400,
                              transition: 'all 0.2s',
                            }}
                            onClick={() => {
                              const updated = generatedQuestions.map(q => ({ ...q, marks: m }));
                              setGeneratedQuestions(updated);
                              toast.success(`Successfully set all questions to ${m} ${m === 1 ? 'mark' : 'marks'}!`);
                            }}
                          >
                            {m} {m === 1 ? 'Mark' : 'Marks'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px', marginTop: 12 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                  AI has generated the following questions. You can review, edit options, change difficulty (marks will update automatically), or delete questions before adding them to your assessment.
                </p>

                {generatedQuestions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-light)',
                      marginBottom: 20,
                      position: 'relative'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleDeleteGeneratedQuestion(qIdx)}
                      style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer'
                      }}
                      title="Discard Question"
                    >
                      <Trash2 size={18} />
                    </button>

                    <div className="form-group" style={{ paddingRight: 32 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: 'var(--primary-light)' }}>Question {qIdx + 1}</label>
                      <textarea
                        className="form-input"
                        value={q.title}
                        onChange={e => handleUpdateGeneratedQuestion(qIdx, 'title', e.target.value)}
                        rows={2}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div className="form-group">
                        <label className="form-label">Difficulty</label>
                        <select
                          className="form-input form-select"
                          value={q.difficulty}
                          onChange={e => handleUpdateGeneratedDifficulty(qIdx, e.target.value)}
                        >
                          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Marks</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Min: 1, Max: 100</span>
                        </label>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                          {[1, 2, 5, 10].map(m => (
                            <button
                              key={m}
                              type="button"
                              className="btn"
                              style={{
                                padding: '4px 8px',
                                fontSize: 11,
                                background: q.marks === m ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                                color: q.marks === m ? '#fff' : 'var(--text-secondary)',
                                border: `1px solid ${q.marks === m ? 'var(--primary)' : 'var(--border-light)'}`,
                                borderRadius: 6,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onClick={() => handleUpdateGeneratedMarks(qIdx, m)}
                            >
                              {m} {m === 1 ? 'Mark' : 'Marks'}
                            </button>
                          ))}
                        </div>
                        <input
                          className="form-input"
                          type="number"
                          value={q.marks}
                          onChange={e => handleUpdateGeneratedMarks(qIdx, Math.max(1, Math.min(100, +e.target.value)))}
                          min={1}
                          max={100}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Options (select the single correct answer)</label>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                          <input
                            type="radio"
                            name={`correct-gen-${qIdx}`}
                            checked={opt.isCorrect}
                            onChange={() => handleUpdateGeneratedOption(qIdx, oIdx, 'isCorrect', true)}
                            style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                          />
                          <input
                            className="form-input"
                            value={opt.text}
                            onChange={e => handleUpdateGeneratedOption(qIdx, oIdx, 'text', e.target.value)}
                            placeholder={`Option ${oIdx + 1}`}
                            style={{ flex: 1, marginBottom: 0 }}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {generatedQuestions.length === 0 && (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <h3>No questions left</h3>
                    <p>All questions were discarded. Close this modal and upload another document to generate questions.</p>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'flex-end',
                  padding: '16px 24px',
                  borderTop: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)'
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={() => setShowAutoGenerateModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveGeneratedQuestions}
                  disabled={generatedQuestions.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Save size={16} />
                  Save all {generatedQuestions.length} Questions
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Question"
        message="Are you sure you want to permanently delete this MCQ? This will completely remove it from MongoDB and Google Sheets databases."
        loading={deleteLoading}
      />
    </div>
  );
}
