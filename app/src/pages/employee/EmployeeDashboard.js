import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, CheckCircle, Play, Eye, Award, TrendingUp, Bell, X, BookOpen, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import socket from '../../services/socket';

const LS_ASSESSMENTS_KEY = 'portal_my_assessments';

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Hydrate from localStorage immediately (prevents blank screen on refresh)
  const [assessments, setAssessments] = useState(() => {
    try {
      const cached = localStorage.getItem(LS_ASSESSMENTS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading]           = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif]       = useState(false);

  // Fetch latest assessments from server — always the source of truth
  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/assessments/my');
      const list = data.assessments || [];
      setAssessments(list);
      // Save to localStorage as backup for next refresh
      localStorage.setItem(LS_ASSESSMENTS_KEY, JSON.stringify(list));
    } catch {
      toast.error('Failed to load assessments');
    }
    setLoading(false);
  }, []);

  // Dashboard loaded normally, users will start the exam manually by clicking the "Start" button
  useEffect(() => {
    console.log('[Dashboard] Loaded successfully');
  }, []);

  useEffect(() => {
    load();

    if (user?._id) {
      // Join user specific room to receive real-time updates
      socket.emit('exam:start', { employeeId: user._id, employeeName: user.fullName, examId: 'dashboard' });

      // New exam assigned notification
      const handleNotification = (notif) => {
        setNotifications(prev => [notif, ...prev]);
        toast.success(`🔔 ${notif.title}: ${notif.message}`, { duration: 5000 });
        load(); // immediately reload to show new exam
      };
      socket.on(`notification:${user._id}`, handleNotification);

      // Refetch data after socket reconnects — critical for Render restarts
      const handleReconnect = () => {
        console.log('[Dashboard] Socket reconnected — refetching exams');
        load();
      };
      socket.on('reconnect', handleReconnect);

      return () => {
        socket.off(`notification:${user._id}`, handleNotification);
        socket.off('reconnect', handleReconnect);
      };
    }
  }, [user?._id, user?.fullName, load]);

  // Filter out invalid assessments (no _id = orphaned reference)
  const validAssessments = assessments.filter(a => a._id && a.title);
  const pending   = validAssessments.filter(a => a.status === 'pending');
  const completed = validAssessments.filter(a => a.status === 'completed');
  const avgScore  = completed.length
    ? Math.round(completed.reduce((s, a) => s + (a.result?.percentage || 0), 0) / completed.length)
    : 0;

  if (loading && assessments.length === 0)
    return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Welcome, {user?.fullName?.split(' ')[0]}! 👋</h1>
          <p>Here's your assessment overview</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" style={{ position: 'relative' }} onClick={() => setShowNotif(v => !v)}>
            <Bell size={18} />
            {notifications.length > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notification Panel */}
      <AnimatePresence>
        {showNotif && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="card" style={{ marginTop: 12, marginBottom: 8, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>🔔 Notifications</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {notifications.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setNotifications([])}>Clear All</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNotif(false)}><X size={16} /></button>
              </div>
            </div>
            {notifications.length === 0
              ? <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No new notifications</p>
              : notifications.map((n, i) => (
                <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={16} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{n.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(n.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 28, marginTop: 20 }}>
        {[
          { icon: FileText,   label: 'Assigned',   value: validAssessments.length, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
          { icon: Clock,      label: 'Pending',     value: pending.length,          color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
          { icon: CheckCircle,label: 'Completed',   value: completed.length,        color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
          { icon: TrendingUp, label: 'Avg Score',   value: `${avgScore}%`,          color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="stat-icon" style={{ background: s.bg }}><s.icon size={24} color={s.color} /></div>
            <div className="stat-info"><h3>{s.value}</h3><p>{s.label}</p></div>
          </motion.div>
        ))}
      </div>

      {/* All Assigned Exams Table */}
      {validAssessments.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} color="var(--primary)" /> My Exams
          </h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Pass Score</th>
                  <th>Assigned Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {validAssessments.map((a, i) => (
                  <motion.tr key={a._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{a.title}</div>
                      {a.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.description.substring(0, 50)}{a.description.length > 50 ? '…' : ''}</div>}
                    </td>
                    <td>
                      <span className="badge badge-primary">{a.questions?.length || 0} Qs</span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <Clock size={13} color="var(--text-muted)" /> {a.duration} min
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <Award size={13} color="var(--success)" /> {a.passingScore}%
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} />
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td>
                      {a.status === 'completed' ? (
                        <span className={`badge ${a.result?.passed ? 'badge-success' : 'badge-danger'}`}>
                          {a.result?.passed ? '✓ Passed' : '✗ Failed'}
                        </span>
                      ) : (
                        <span className="badge badge-warning">⏳ Pending</span>
                      )}
                    </td>
                    <td>
                      {a.status === 'completed' ? (
                        a.result && (
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/dashboard/result/${a.result._id}`)}>
                            <Eye size={14} /> Result
                          </button>
                        )
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/exam/${a._id}`)}>
                          <Play size={14} /> Start
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Results Summary */}
      {completed.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={20} color="var(--success)" /> Results Summary
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {completed.map((a, i) => (
              <motion.div key={a._id || i} className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ padding: '18px 20px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15, marginBottom: 10 }}>{a.title}</div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: a.result?.passed ? 'var(--success)' : 'var(--danger)' }}>{a.result?.percentage || 0}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{a.result?.violationCount || 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Violations</div>
                  </div>
                  <div>
                    <span className={`badge ${a.result?.passed ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 13, padding: '6px 12px' }}>
                      {a.result?.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                </div>
                {a.result && (
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate(`/dashboard/result/${a.result._id}`)}>
                    <Eye size={14} /> View Detailed Result
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {validAssessments.length === 0 && !loading && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <FileText size={48} />
          <h3>No assessments assigned</h3>
          <p>Your admin will assign assessments to you soon</p>
        </div>
      )}
    </div>
  );
}
