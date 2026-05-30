import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, Download, Trophy, Eye, Trash2, CheckCircle2,
  Clock, Building2, Briefcase, Hash, Calendar, Search, Filter
} from 'lucide-react';
import api from '../../services/api';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import toast from 'react-hot-toast';
import socket from '../../services/socket';

// Status values that constitute a "completed" exam
const COMPLETED_STATUSES = ['submitted', 'auto-submitted', 'completed', 'graded'];

const statusLabel = (status) => {
  switch (status) {
    case 'submitted': return { text: 'Submitted', cls: 'badge-success' };
    case 'auto-submitted': return { text: 'Auto-Submitted', cls: 'badge-warning' };
    case 'completed': return { text: 'Completed', cls: 'badge-success' };
    case 'graded': return { text: 'Graded', cls: 'badge-primary' };
    default: return { text: status || 'Unknown', cls: 'badge-secondary' };
  }
};

const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtTime = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function AdminResults() {
  const navigate = useNavigate();

  const [results, setResults] = useState(() => {
    try {
      const cached = localStorage.getItem('admin_results_list');
      const parsed = cached ? JSON.parse(cached) : [];
      // Enforce completed-only filter even on cached data
      return parsed.filter(r => COMPLETED_STATUSES.includes(r.status));
    } catch { return []; }
  });

  const [assessments, setAssessments] = useState(() => {
    try {
      const cached = localStorage.getItem('admin_assessments_list');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const [filterAssessment, setFilterAssessment] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'score' | 'name'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(() => !localStorage.getItem('admin_results_list'));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredAndSorted = React.useMemo(() => {
    let arr = results;

    // Strict: only completed statuses (belt-and-suspenders — server also filters)
    arr = arr.filter(r => COMPLETED_STATUSES.includes(r.status));

    // Assessment filter
    if (filterAssessment) arr = arr.filter(r => r.assessment?._id === filterAssessment);

    // Search filter — matches employee name, employee ID, or assessment name
    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      arr = arr.filter(r =>
        (r.employee?.fullName || '').toLowerCase().includes(q) ||
        (r.employee?.employeeId || '').toLowerCase().includes(q) ||
        (r.assessment?.title || '').toLowerCase().includes(q) ||
        (r.employee?.department || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'score') arr = [...arr].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    else if (sortBy === 'name') arr = [...arr].sort((a, b) => (a.employee?.fullName || '').localeCompare(b.employee?.fullName || ''));
    else arr = [...arr].sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));

    return arr;
  }, [results, filterAssessment, filterSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage));
  const paginatedResults = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [filterAssessment, filterSearch, sortBy]);

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = async () => {
    const hasCache = results.length > 0;
    if (!hasCache) setLoading(true);
    try {
      const [rRes, aRes] = await Promise.all([api.get('/results'), api.get('/assessments')]);
      const rawResults = (rRes.data.results || []).filter(r => COMPLETED_STATUSES.includes(r.status));
      setResults(rawResults);
      setAssessments(aRes.data.assessments || []);
      localStorage.setItem('admin_results_list', JSON.stringify(rawResults));
      localStorage.setItem('admin_assessments_list', JSON.stringify(aRes.data.assessments || []));
    } catch { }
    setLoading(false);
  };

  useEffect(() => {
    load();
    socket.on('db:sync', () => {
      console.log('📡 Real-time sync signal received: updating results list');
      load();
    });
    return () => { socket.off('db:sync'); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/results/${deleteTarget}`);
      toast.success('Result permanently deleted');
      setResults(prev => prev.filter(r => r._id !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete result');
    }
    setDeleteLoading(false);
  };

  const exportCSV = () => {
    const headers = 'Rank,Employee Name,Employee ID,Department,Designation,Assessment,Date Completed,Time Taken (min),Score,Percentage,Pass/Fail,Correct,Wrong,Status\n';
    const rows = filteredAndSorted.map((r, i) =>
      `${i + 1},"${r.employee?.fullName || ''}","${r.employee?.employeeId || ''}","${r.employee?.department || ''}","${r.employee?.designation || ''}","${r.assessment?.title || ''}","${fmtDate(r.submittedAt)}",${r.completionTime || 0},${r.totalScore || 0}/${r.totalMarks || 0},${r.percentage || 0}%,${r.passed === true || r.passed === 'true' ? 'PASS' : 'FAIL'},${r.correctAnswers || 0},${r.wrongAnswers || 0},${r.status}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `completed-results-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Summary stats ─────────────────────────────────────────────────────────

  const summaryStats = React.useMemo(() => {
    const arr = filteredAndSorted;
    if (!arr.length) return null;
    const passed = arr.filter(r => r.passed === true || r.passed === 'true').length;
    const avgPct = Math.round(arr.reduce((s, r) => s + (r.percentage || 0), 0) / arr.length);
    const avgTime = Math.round(arr.reduce((s, r) => s + (parseInt(r.completionTime) || 0), 0) / arr.length);
    return { total: arr.length, passed, failed: arr.length - passed, avgPct, avgTime };
  }, [filteredAndSorted]);

  // ── Skeleton ──────────────────────────────────────────────────────────────

  const SkeletonRow = () => (
    <tr style={{ animation: 'pulse 1.5s infinite ease-in-out' }}>
      {[40, 160, 130, 90, 70, 80, 60, 50, 60].map((w, i) => (
        <td key={i}><div style={{ height: 16, width: w, backgroundColor: 'var(--border-light)', borderRadius: 4 }} /></td>
      ))}
    </tr>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ─── Page header ─── */}
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Reports &amp; Analytics</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} color="#10b981" />
            Showing only fully completed exams
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* ─── Summary strip ─── */}
      {summaryStats && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginTop: 20,
          }}>
          {[
            { icon: CheckCircle2, label: 'Total Completed', value: summaryStats.total, color: '#10b981' },
            { icon: Trophy, label: 'Passed', value: summaryStats.passed, color: '#10b981' },
            { icon: BarChart3, label: 'Failed', value: summaryStats.failed, color: '#ef4444' },
            { icon: BarChart3, label: 'Avg Score', value: `${summaryStats.avgPct}%`, color: '#6366f1' },
            { icon: Clock, label: 'Avg Time', value: `${summaryStats.avgTime} min`, color: '#f59e0b' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ─── Filters bar ─── */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36, marginBottom: 0 }}
            placeholder="Search employee, ID, department…"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
          />
        </div>
        {/* Assessment filter */}
        <select className="form-input form-select" value={filterAssessment} onChange={e => setFilterAssessment(e.target.value)}
          style={{ width: 200, marginBottom: 0 }}>
          <option value="">All Assessments</option>
          {assessments.map(a => <option key={a._id} value={a._id}>{a.title}</option>)}
        </select>
        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select className="form-input form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ width: 150, marginBottom: 0 }}>
            <option value="date">Latest First</option>
            <option value="score">Highest Score</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="card" style={{ marginTop: 18, padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Employee</th>
                <th>Assessment</th>
                <th>Completed On</th>
                <th>Time Taken</th>
                <th>Score</th>
                <th>C / W</th>
                <th>Result</th>
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
                  const emp = r.employee || {};
                  const st = statusLabel(r.status);
                  const isPassed = r.passed === true || r.passed === 'true';

                  return (
                    <motion.tr
                      key={r._id ? `${r._id}-${i}` : i}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    >
                      {/* Rank */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {sortBy === 'score' && globalRank < 3 && filterAssessment && (
                            <Trophy size={13} color={globalRank === 0 ? '#fbbf24' : globalRank === 1 ? '#94a3b8' : '#cd7f32'} />
                          )}
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{globalRank + 1}</span>
                        </div>
                      </td>

                      {/* Employee — full profile from Employee module */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0, opacity: emp.notFound ? 0.5 : 1 }}>
                            {(emp.fullName || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: emp.notFound ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: 13 }}>
                              {emp.fullName || 'Employee Not Found'}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', marginTop: 3 }}>
                              {emp.employeeId && (
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Hash size={9} />{emp.employeeId}
                                </span>
                              )}
                              {emp.department && emp.department !== 'N/A' && (
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Building2 size={9} />{emp.department}
                                </span>
                              )}
                              {emp.designation && (
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Briefcase size={9} />{emp.designation}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assessment */}
                      <td style={{ fontSize: 13 }}>
                        {r.assessment?.title || '—'}
                      </td>

                      {/* Date & time of completion */}
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={11} color="var(--text-muted)" />
                          {fmtDate(r.submittedAt || r.endTime)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {fmtTime(r.submittedAt || r.endTime)}
                        </div>
                      </td>

                      {/* Time taken */}
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> {r.completionTime ? `${r.completionTime} min` : '—'}
                        </span>
                      </td>

                      {/* Score */}
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {r.totalScore || 0}/{r.totalMarks || 0}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>({r.percentage || 0}%)</span>
                      </td>

                      {/* Correct / Wrong */}
                      <td style={{ fontSize: 13 }}>
                        <span style={{ color: 'var(--success)' }}>{r.correctAnswers || 0}</span>
                        {' / '}
                        <span style={{ color: 'var(--danger)' }}>{r.wrongAnswers || 0}</span>
                      </td>

                      {/* Pass / Fail */}
                      <td>
                        <span className={`badge ${isPassed ? 'badge-success' : 'badge-danger'}`}>
                          {isPassed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${st.cls}`}>{st.text}</span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/admin/results/${r._id}`)}
                            title="View Question Analysis">
                            <Eye size={15} />
                          </button>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => setDeleteTarget(r._id)}
                            title="Delete Result">
                            <Trash2 size={15} color="var(--danger)" />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} completed results
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
              <span style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                {currentPage} / {totalPages}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredAndSorted.length === 0 && (
          <div className="empty-state" style={{ padding: '60px 20px' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--border)' }} />
            <h3>No completed exams found</h3>
            <p>
              {filterSearch || filterAssessment
                ? 'No completed exams match your filters. Try adjusting the search or assessment filter.'
                : 'Results will appear here once employees submit their exams.'}
            </p>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Exam Result"
        message="Are you sure you want to permanently delete this exam result? This will completely remove it from the Google Sheets database."
        loading={deleteLoading}
      />
    </div>
  );
}
