import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, Trophy } from 'lucide-react';
import api from '../../services/api';

export default function AdminResults() {
  const [results, setResults] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [rRes, aRes] = await Promise.all([api.get('/results'), api.get('/assessments')]);
        setResults(rRes.data.results);
        setAssessments(aRes.data.assessments);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

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
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => b.percentage - a.percentage).map((r, i) => (
                <motion.tr key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
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
    </div>
  );
}
