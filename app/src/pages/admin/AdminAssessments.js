import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Edit, Trash2, X, Clock, Award, Settings,
  Send, Users, RefreshCw, User, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CATEGORIES = ['General', 'Technical', 'Aptitude', 'HR', 'Coding'];
const STATUS_COLORS = { draft: 'badge-muted', active: 'badge-success', scheduled: 'badge-warning', completed: 'badge-info' };
const defaultForm = {
  title: '', description: '', duration: 30, timePerQuestion: 30,
  passingScore: 60, category: 'General', isRandomized: false, maxViolations: 3, status: 'draft',
};

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(null); // assessment to send
  const [editing, setEditing] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendTarget, setSendTarget] = useState('all'); // 'all' | 'department' | 'individual'
  const [sendDept, setSendDept] = useState('');
  const [sendEmployeeIds, setSendEmployeeIds] = useState([]);
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);

  const load = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [aRes, eRes] = await Promise.all([api.get('/assessments'), api.get('/employees')]);
      setAssessments(aRes.data.assessments || []);
      setEmployees(eRes.data.employees || []);
    } catch {
      if (!isBackground) toast.error('Failed to load data');
    }
    if (!isBackground) setLoading(false);
  };
  useEffect(() => {
    load();
    const intervalId = setInterval(() => {
      console.log('[AdminAssessments] Polling fresh data from server...');
      load(true);
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/assessments/${editing._id}`, form);
        toast.success('Assessment updated');
      } else {
        await api.post('/assessments', form);
        toast.success('Assessment created!');
      }
      setShowModal(false); setEditing(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assessment and all its questions?')) return;
    try { await api.delete(`/assessments/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      title: a.title, description: a.description || '', duration: a.duration,
      timePerQuestion: a.timePerQuestion, passingScore: a.passingScore,
      category: a.category, isRandomized: a.isRandomized, maxViolations: a.maxViolations, status: a.status,
    });
    setShowModal(true);
  };

  const openSend = (a) => {
    setShowSendModal(a);
    setSendTarget('all');
    setSendDept('');
    setSendEmployeeIds([]);
  };

  const toggleEmployeeSelect = (id) => {
    setSendEmployeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const handleSendExam = async () => {
    if (!showSendModal) return;
    setSending(true);
    try {
      let targetEmployeeIds = [];
      if (sendTarget === 'all') {
        targetEmployeeIds = employees.map(e => e._id);
      } else if (sendTarget === 'department') {
        targetEmployeeIds = employees.filter(e => e.department === sendDept).map(e => e._id);
      } else {
        targetEmployeeIds = sendEmployeeIds;
      }

      if (targetEmployeeIds.length === 0) {
        toast.error('No employees selected');
        setSending(false);
        return;
      }

      // Assign exam to each employee
      await api.post(`/assessments/${showSendModal._id}/assign-bulk`, {
        employeeIds: targetEmployeeIds,
        assessmentId: showSendModal._id,
      });

      toast.success(`✅ Exam sent to ${targetEmployeeIds.length} employee(s) & synced to Google Sheets!`);
      setShowSendModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send exam');
    }
    setSending(false);
  };

  // const filteredEmployees = sendTarget === 'department'
  //   ? employees.filter(e => e.department === sendDept)
  //   : employees; // Removed unused variable

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Assessment Management</h1>
          <p>Create, manage, and assign assessments to employees</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(defaultForm); setShowModal(true); }}>
            <Plus size={18} /> Create Assessment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginTop: 24, marginBottom: 20 }}>
        {[
          { label: 'Total', value: assessments.length, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
          { label: 'Active', value: assessments.filter(a => a.status === 'active').length, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
          { label: 'Draft', value: assessments.filter(a => a.status === 'draft').length, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
          { label: 'Completed', value: assessments.filter(a => a.status === 'completed').length, color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="stat-icon" style={{ background: s.bg }}><FileText size={22} color={s.color} /></div>
            <div className="stat-info"><h3>{s.value}</h3><p>{s.label}</p></div>
          </motion.div>
        ))}
      </div>

      {/* Assessment Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
        {assessments.map((a, i) => (
          <motion.div key={a._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', flex: 1, marginRight: 8 }}>{a.title}</h3>
                <span className={`badge ${STATUS_COLORS[a.status] || 'badge-muted'}`}>{a.status}</span>
              </div>
              {a.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.description}</p>}
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <Users size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {a.assignedTo?.length || 0} employees assigned
              </div>
            </div>

            <div style={{ padding: '14px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <Clock size={15} color="var(--secondary)" />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{a.duration}m</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Duration</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <FileText size={15} color="var(--primary-light)" />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{a.questions?.length || 0}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Questions</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Award size={15} color="var(--success)" />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{a.passingScore}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pass Score</div>
              </div>
            </div>

            <div style={{ padding: '12px 24px 16px', display: 'flex', gap: 8, borderTop: '1px solid var(--border-light)' }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => openSend(a)}>
                <Send size={14} /> Send Exam
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/questions/${a._id}`)}>
                <Settings size={14} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>
                <Edit size={14} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a._id)}>
                <Trash2 size={14} color="var(--danger)" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {assessments.length === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <FileText size={48} />
          <h3>No assessments yet</h3>
          <p>Create your first assessment to begin</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
            <motion.div className="modal" style={{ maxWidth: 560 }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">{editing ? 'Edit Assessment' : 'Create Assessment'}</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" name="title" value={form.title} onChange={handleChange} required placeholder="e.g. JavaScript Fundamentals" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" name="description" value={form.description} onChange={handleChange} placeholder="Assessment description..." rows={3} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Duration (min)</label>
                    <input className="form-input" name="duration" type="number" value={form.duration} onChange={handleChange} min={1} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time/Question (sec)</label>
                    <input className="form-input" name="timePerQuestion" type="number" value={form.timePerQuestion} onChange={handleChange} min={5} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pass Score (%)</label>
                    <input className="form-input" name="passingScore" type="number" value={form.passingScore} onChange={handleChange} min={0} max={100} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-input form-select" name="category" value={form.category} onChange={handleChange}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input form-select" name="status" value={form.status} onChange={handleChange}>
                      {['draft', 'active', 'scheduled', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Max Violations</label>
                    <input className="form-input" name="maxViolations" type="number" value={form.maxViolations} onChange={handleChange} min={1} />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 28 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14 }}>
                      <input type="checkbox" name="isRandomized" checked={form.isRandomized} onChange={handleChange} style={{ accentColor: 'var(--primary)' }} />
                      Randomize Questions
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Exam Modal */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSendModal(null)}>
            <motion.div className="modal" style={{ maxWidth: 560 }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title"><Send size={18} style={{ marginRight: 8 }} />Send Exam</h3>
                <button className="modal-close" onClick={() => setShowSendModal(null)}><X size={20} /></button>
              </div>

              {/* Exam Info */}
              <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Exam</span><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{showSendModal.title}</div></div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Questions</span><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{showSendModal.questions?.length || 0}</div></div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Duration</span><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{showSendModal.duration} min</div></div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Category</span><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{showSendModal.category}</div></div>
              </div>

              {/* Target Selection */}
              <div className="form-group">
                <label className="form-label">Send To</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { value: 'all', label: 'All Employees', icon: <Users size={16} /> },
                    { value: 'department', label: 'By Department', icon: <Building2 size={16} /> },
                    { value: 'individual', label: 'Select Employees', icon: <User size={16} /> },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setSendTarget(opt.value)}
                      style={{
                        padding: '10px 8px', borderRadius: 8, border: `2px solid ${sendTarget === opt.value ? 'var(--primary)' : 'var(--border-light)'}`,
                        background: sendTarget === opt.value ? 'rgba(99,102,241,0.12)' : 'transparent',
                        color: sendTarget === opt.value ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      }}>
                      {opt.icon}{opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Picker */}
              {sendTarget === 'department' && (
                <div className="form-group">
                  <label className="form-label">Select Department</label>
                  <select className="form-input form-select" value={sendDept} onChange={e => setSendDept(e.target.value)}>
                    <option value="">— Choose Department —</option>
                    {departments.map(d => <option key={d}>{d}</option>)}
                  </select>
                  {sendDept && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    {employees.filter(e => e.department === sendDept).length} employee(s) in {sendDept}
                  </p>}
                </div>
              )}

              {/* Individual Employee Picker */}
              {sendTarget === 'individual' && (
                <div className="form-group">
                  <label className="form-label">Select Employees ({sendEmployeeIds.length} selected)</label>
                  <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8, padding: 8 }}>
                    {employees.length === 0
                      ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 12, fontSize: 13 }}>No employees found</p>
                      : employees.map(e => (
                        <label key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', cursor: 'pointer', borderRadius: 6 }}>
                          <input type="checkbox" checked={sendEmployeeIds.includes(e._id)} onChange={() => toggleEmployeeSelect(e._id)} style={{ accentColor: 'var(--primary)' }} />
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{(e.fullName || '?')[0]}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{e.fullName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.email} · {e.department}</div>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div style={{ background: 'rgba(16,185,129,0.07)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
                ✅ Exam assignment will be logged in <strong>Google Sheets</strong> with all employee details.
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowSendModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSendExam} disabled={sending}>
                  <Send size={16} /> {sending ? 'Sending...' : 'Send Exam'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
