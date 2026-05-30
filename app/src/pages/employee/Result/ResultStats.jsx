import React from 'react';

export function ResultStats({ startTimeStr, endTimeStr, scorePercent, summary, passed, durationStr, exam }) {

  const stats = [
    {
      val: `${scorePercent}%`,
      label: 'SCORE',
      sub: `${summary?.scoreRaw ?? summary?.correctCount ?? 0} of ${summary?.totalQuestions ?? exam?.totalMarks ?? '—'} pts`,
      color: passed ? '#3B6D11' : '#A32D2D',
      accent: passed ? '#3B6D11' : '#E24B4A',
    },
    {
      val: durationStr,
      label: 'DURATION',
      sub: exam?.duration ? `${exam.duration}m allowed` : `${startTimeStr} – ${endTimeStr}`,
      color: '#2C2C2A',
      accent: '#3B6D11',
    },
    {
      val: summary?.correctCount ?? 0,
      label: 'CORRECT',
      sub: null,
      color: '#2C2C2A',
      accent: '#3B6D11',
    },
    {
      val: summary?.wrongCount ?? 0,
      label: 'WRONG',
      sub: null,
      color: '#A32D2D',
      accent: '#E24B4A',
      highlight: true,
    },
    {
      val: summary?.unattemptedCount ?? summary?.skippedCount ?? 0,
      label: 'SKIPPED',
      sub: null,
      color: '#2C2C2A',
      accent: '#B4B2A9',
    },
  ];

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8E6DF' }}>
      <p style={{
        fontSize: 10, fontWeight: 600, color: '#888780',
        letterSpacing: '.8px', marginBottom: 10,
      }}>
        PERFORMANCE SUMMARY
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0,1fr))',
        gap: 8,
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: s.highlight ? '#FFF0F0' : '#F9F8F5',
            border: `0.5px solid ${s.highlight ? '#F7C1C1' : '#E8E6DF'}`,
            borderRadius: 10, padding: '12px 10px',
          }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.color, lineHeight: 1 }}>
              {s.val}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#888780', letterSpacing: '.4px', marginTop: 4 }}>
              {s.label}
            </div>
            {s.sub && (
              <div style={{ fontSize: 10, color: '#888780', marginTop: 2 }}>{s.sub}</div>
            )}
            <div style={{
              height: 3, borderRadius: 2, marginTop: 10,
              background: s.accent,
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}