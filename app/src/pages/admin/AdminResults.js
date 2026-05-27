import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Download, Trophy, Eye, Trash2 } from 'lucide-react';
import api from '../../services/api';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import toast from 'react-hot-toast';
import socket from '../../services/socket';

export default function AdminResults() {
  const navigate = useNavigate();
  const [results, setResults] = useState(() => {
    try {
      const cached = localStorage.getItem('admin_results_list');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [assessments, setAssessments] = useState(() => {
    try {
      const cached = localStorage.getItem('admin_assessments_list');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('admin_results_list');
  });

  const load = async () => {
    const hasCache = results.length > 0;
    if (!hasCache) setLoading(true);
    try {
      const [rRes, aRes] = await Promise.all([api.get('/results'), api.get('/assessments')]);
      setResults(rRes.data.results || []);
      setAssessments(aRes.data.assessments || []);
      localStorage.setItem('admin_results_list', JSON.stringify(rRes.data.results || []));
      localStorage.setItem('admin_assessments_list', JSON.stringify(aRes.data.assessments || []));
    } catch { }
    setLoading(false);
  };

  useEffect(() => {
    load();

    // Live Socket sync hook
    socket.on('db:sync', () => {
      console.log('📡 Real-time sync signal received: updating results list');
      load();
    });

    return () => {
      socket.off('db:sync');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const triggerDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/results/${deleteTarget}`);
      toast.success('Result permanently deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete result');
    }
    setDeleteLoading(false);
  };

  const exportCSV = () => {
    const headers = 'Employee,Email,Assessment,Score,Percentage,Status,Violations,Completion Time\n';
    const rows = filtered.map(r =>
      `"${r.employee?.fullName}","${r.employee?.email}","${r.assessment?.title}",${r.totalScore}/${r.totalMarks},${r.percentage}%,${r.status},${r.violationCount},${r.completionTime || 0}min`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'results.csv'; a.click();
  };

  const filtered = results.filter(r => !filter || r.assessment?._id === filter);

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Reports & Analytics</h1>
          <p>View scores, rankings, and performance</p>
        </div>
        <div className="page-actions">
          <select className="form-input form-select" value={filter} onChange={e => setFilter(e.target.value)}
            style={{ width: 200, marginBottom: 0 }}>
            <option value="">All Assessments</option>
            {assessments.map(a => <option key={a._id} value={a._id}>{a.title}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={exportCSV}><Download size={16} /> Export CSV</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Employee</th>
                <th>Assessment</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Result</th>
                <th>Violations</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => b.percentage - a.percentage).map((r, i) => (
                <motion.tr key={r._id ? `${r._id}-${i}` : i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {i < 3 && <Trophy size={14} color={i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : '#cd7f32'} />}
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{i + 1}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                        {(r.employee?.fullName || r.employeeName || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                          {r.employee?.fullName || r.employeeName || 'Unknown Candidate'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {r.employee?.department || r.employee?.email || 'General'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{r.assessment?.title}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.totalScore}/{r.totalMarks}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="progress-bar" style={{ width: 60 }}>
                        <div className="progress-fill" style={{ width: `${r.percentage}%`, background: r.passed ? 'var(--gradient-success)' : 'var(--gradient-danger)' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: r.passed ? 'var(--success)' : 'var(--danger)' }}>{r.percentage}%</span>
                    </div>
                  </td>
                  <td><span className={`badge ${r.passed ? 'badge-success' : 'badge-danger'}`}>{r.passed ? 'Passed' : 'Failed'}</span></td>
                  <td><span className={`badge ${r.violationCount > 0 ? 'badge-warning' : 'badge-muted'}`}>{r.violationCount}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.completionTime || '—'}m</td>
                  <td><span className={`badge ${r.status === 'submitted' ? 'badge-success' : r.status === 'disqualified' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        const empId = r.employee?._id || r.employee;
                        const examId = r.assessment?._id || r.assessment;
                        navigate(`/admin/result/${empId}/${examId}`);
                      }} title="View Question Analysis">
                        <Eye size={16} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => triggerDelete(r._id)} title="Delete Result">
                        <Trash2 size={16} color="var(--danger)" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="empty-state">
            <BarChart3 size={48} />
            <h3>No results yet</h3>
            <p>Results will appear when employees complete assessments</p>
          </div>
        )}
      </div>


      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Exam Result"
        message="Are you sure you want to permanently delete this exam result? This will completely remove it from MongoDB and Google Sheets databases."
        loading={deleteLoading}
      />
    </div>
  );
}
