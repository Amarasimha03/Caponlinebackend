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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('admin_results_list');
  });

  const filteredAndSorted = React.useMemo(() => {
    let arr = results;
    if (filter) arr = arr.filter(r => r.assessment?._id === filter);
    return arr.sort((a, b) => b.percentage - a.percentage);
  }, [results, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage));
  const paginatedResults = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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
      setResults(prev => prev.filter(r => r._id !== deleteTarget)); // Optimistic UI Update
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete result');
    }
    setDeleteLoading(false);
  };

  const exportCSV = () => {
    const headers = 'Employee,Email,Assessment,Score,Percentage,Status,Violations,Completion Time\n';
    const rows = filteredAndSorted.map(r =>
      `"${r.employee?.fullName}","${r.employee?.email}","${r.assessment?.title}",${r.totalScore}/${r.totalMarks},${r.percentage}%,${r.status},${r.violationCount},${r.completionTime || 0}min`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'results.csv'; a.click();
  };

  const SkeletonRow = () => (
    <tr style={{ animation: 'pulse 1.5s infinite ease-in-out' }}>
      <td><div style={{ height: 20, width: 40, backgroundColor: 'var(--border-light)', borderRadius: 4 }} /></td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 32, width: 32, backgroundColor: 'var(--border-light)', borderRadius: '50%' }} />
          <div>
            <div style={{ height: 14, width: 100, backgroundColor: 'var(--border-light)', borderRadius: 4, marginBottom: 6 }} />
            <div style={{ height: 10, width: 60, backgroundColor: 'var(--border-light)', borderRadius: 4 }} />
          </div>
        </div>
      </td>
      <td><div style={{ height: 14, width: 120, backgroundColor: 'var(--border-light)', borderRadius: 4 }} /></td>
      <td><div style={{ height: 14, width: 50, backgroundColor: 'var(--border-light)', borderRadius: 4 }} /></td>
      <td><div style={{ height: 14, width: 80, backgroundColor: 'var(--border-light)', borderRadius: 4 }} /></td>
      <td><div style={{ height: 20, width: 60, backgroundColor: 'var(--border-light)', borderRadius: 12 }} /></td>
      <td><div style={{ height: 20, width: 40, backgroundColor: 'var(--border-light)', borderRadius: 12 }} /></td>
      <td><div style={{ height: 14, width: 40, backgroundColor: 'var(--border-light)', borderRadius: 4 }} /></td>
      <td><div style={{ height: 20, width: 60, backgroundColor: 'var(--border-light)', borderRadius: 12 }} /></td>
      <td><div style={{ height: 32, width: 60, backgroundColor: 'var(--border-light)', borderRadius: 6 }} /></td>
    </tr>
  );

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
                <th>C/W</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && paginatedResults.length === 0 ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : (
                paginatedResults.map((r, i) => {
                  const globalRank = (currentPage - 1) * itemsPerPage + i;
                  return (
                    <motion.tr key={r._id ? `${r._id}-${i}` : i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {globalRank < 3 && filter && <Trophy size={14} color={globalRank === 0 ? '#fbbf24' : globalRank === 1 ? '#94a3b8' : '#cd7f32'} />}
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{globalRank + 1}</span>
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
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {r.totalScore || 0}/{r.totalMarks || 0} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({r.percentage || 0}%)</span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--success)' }}>{r.correctAnswers || 0}</span> / <span style={{ color: 'var(--danger)' }}>{r.wrongAnswers || 0}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>{r.startedAt || r.startTime ? new Date(r.startedAt || r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td style={{ fontSize: 13 }}>{r.submittedAt || r.endTime ? new Date(r.submittedAt || r.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>
                        <span className={`badge ${r.status === 'completed' || r.status === 'auto-submitted' || r.status === 'submitted' ? 'badge-success' : r.status === 'in-progress' ? 'badge-warning' : 'badge-danger'}`}>
                          {r.status || 'unknown'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            navigate(`/admin/results/${r._id}`);
                          }} title="View Question Analysis">
                            <Eye size={16} />
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => triggerDelete(r._id)} title="Delete Result">
                            <Trash2 size={16} color="var(--danger)" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} entries
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                {currentPage} / {totalPages}
              </span>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {!loading && filteredAndSorted.length === 0 && (
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
        message="Are you sure you want to permanently delete this exam result? This will completely remove it from Google Sheets database."
        loading={deleteLoading}
      />
    </div>
  );
}
