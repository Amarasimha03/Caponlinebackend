import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, CheckCircle, TrendingUp, AlertTriangle, Clock, Award, BarChart3, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState(() => {
    try {
      const cached = localStorage.getItem('admin_dashboard_stats');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [analytics, setAnalytics] = useState(() => {
    try {
      const cached = localStorage.getItem('admin_dashboard_analytics');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [violations, setViolations] = useState(() => {
    try {
      const cached = localStorage.getItem('admin_dashboard_violations');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('admin_dashboard_stats');
  });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const hasCache = !!localStorage.getItem('admin_dashboard_stats');
    if (!hasCache) setLoading(true);
    try {
      const [statsRes, analyticsRes, violRes] = await Promise.all([
        api.get('/assessments/stats'),
        api.get('/results/analytics'),
        api.get('/violations/stats'),
      ]);
      setStats(statsRes.data.stats);
      setAnalytics(analyticsRes.data.analytics);
      setViolations(violRes.data.stats || []);
      
      localStorage.setItem('admin_dashboard_stats', JSON.stringify(statsRes.data.stats));
      localStorage.setItem('admin_dashboard_analytics', JSON.stringify(analyticsRes.data.analytics));
      localStorage.setItem('admin_dashboard_violations', JSON.stringify(violRes.data.stats || []));
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await api.post('/sync-db');
      const { counts } = res.data;
      setSyncMsg(`✅ Synced: ${counts.employees} employees, ${counts.assessments} assessments, ${counts.results} results`);
      await load(); // reload dashboard stats
    } catch (err) {
      setSyncMsg('❌ Sync failed: ' + (err.response?.data?.message || err.message));
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 6000);
  };

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  const statCards = [
    { icon: Users, label: 'Total Employees', value: stats?.totalEmployees || 0, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { icon: FileText, label: 'Assessments', value: stats?.totalAssessments || 0, color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
    { icon: CheckCircle, label: 'Completed Exams', value: stats?.completedExams || 0, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { icon: TrendingUp, label: 'Avg Score', value: `${stats?.avgScore || 0}%`, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  ];

  const deptData = analytics?.departmentPerformance?.map(d => ({ name: d._id || 'N/A', score: Math.round(d.avgScore), count: d.count })) || [];
  const pieData = [
    { name: 'Passed', value: analytics?.passedResults || 0 },
    { name: 'Failed', value: analytics?.failedResults || 0 },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Dashboard Overview</h1>
          <p>Real-time overview of your assessment platform</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: syncing ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.4)',
              color: '#818cf8', borderRadius: 8, padding: '8px 16px',
              cursor: syncing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync from Google Sheets'}
          </button>
          {syncMsg && <span style={{ fontSize: 12, color: syncMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{syncMsg}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {statCards.map((s, i) => (
          <motion.div
            key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.2 }} className="stat-card"
          >
            <div className="stat-icon" style={{ background: s.bg }}>
              <s.icon size={24} color={s.color} />
            </div>
            <div className="stat-info">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.2 }} className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>
            <BarChart3 size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Department Performance
          </h3>
          <div style={{ height: 280, width: '100%', minWidth: 0, position: 'relative' }}>
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#12141f', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f1f5f9' }} />
                  <Bar dataKey="score" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>No department data yet</p></div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.2 }} className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>
            <Award size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Pass/Fail Ratio
          </h3>
          <div style={{ height: 280, width: '100%', minWidth: 0, position: 'relative' }}>
            {(pieData[0].value + pieData[1].value) > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={i === 0 ? '#10b981' : '#ef4444'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#12141f', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f1f5f9' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>No results yet</p></div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Violations & Quick Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.2 }} className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="var(--warning)" /> Violation Breakdown
          </h3>
          {violations.length > 0 ? violations.map((v, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < violations.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{v._id?.replace('-', ' ')}</span>
              <span className="badge badge-warning">{v.count}</span>
            </div>
          )) : <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No violations recorded</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.2 }} className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color="var(--info)" /> Quick Stats
          </h3>
          {[
            { label: 'Pass Rate', value: `${analytics?.passRate || 0}%`, badge: 'badge-success' },
            { label: 'Avg Score', value: `${analytics?.avgScore || 0}%`, badge: 'badge-primary' },
            { label: 'Avg Completion Time', value: `${analytics?.avgCompletionTime || 0} min`, badge: 'badge-info' },
            { label: 'Total Violations', value: analytics?.totalViolations || 0, badge: 'badge-danger' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border-light)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
              <span className={`badge ${item.badge}`}>{item.value}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
