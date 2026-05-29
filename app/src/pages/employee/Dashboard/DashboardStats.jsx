import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle, TrendingUp } from 'lucide-react';

export default function DashboardStats({ assessments, results }) {
  // Safe parsing of numbers to avoid NaN
  const safeNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val));

  const validAssessments = Array.isArray(assessments) ? assessments : [];
  const assignedCount = validAssessments.length;

  // ✅ Fix 1: handle examCompleted as both boolean true and string "true" (Google Sheets returns strings)
  const isCompleted = (a) =>
    a.status === 'completed' ||
    a.result?.status === 'submitted' ||
    a.result?.status === 'auto-submitted' ||
    a.result?.status === 'completed' ||
    String(a.result?.examCompleted).toLowerCase() === 'true';

  const completedCount = validAssessments.filter(isCompleted).length;
  const pendingCount = Math.max(0, assignedCount - completedCount);

  // ✅ Fix 2: use r.percentage (always set on submit) — r.score doesn't exist in result objects
  const scoredResults = validAssessments
    .map(a => a.result)
    .filter(r =>
      r &&
      (r.status === 'submitted' || r.status === 'auto-submitted' || r.status === 'completed' || String(r.examCompleted).toLowerCase() === 'true') &&
      r.percentage !== undefined
    );

  const avgScore = scoredResults.length > 0
    ? scoredResults.reduce((acc, r) => acc + safeNumber(r.percentage), 0) / scoredResults.length
    : 0;

  // ✅ Fix 3: label names match the screenshot shown by the user
  const stats = [
    { label: 'Assessments', value: assignedCount, icon: FileText, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Completed Exams', value: completedCount, icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Avg Score', value: `${Math.round(avgScore)}%`, icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Pending', value: pendingCount, icon: Clock, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 32 }}>
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 20
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <s.icon size={24} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {s.label}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
