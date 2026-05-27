import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Download, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ── Helpers ─────────────────────────────────────────────────
const OPTION_KEYS = ["A", "B", "C", "D", "E"];

function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s > 0 ? s + "s" : ""}`.trim() : `${s}s`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// ── Sub-components ───────────────────────────────────────────

function StatCard({ value, label, color }) {
  const colorMap = {
    green:   { value: "#3b6d11", bg: "#eaf3de" },
    red:     { value: "#a32d2d", bg: "#fcebeb" },
    neutral: { value: "#18181b", bg: "#f4f4f5" },
    muted:   { value: "#888780", bg: "#f4f4f5" },
  };
  const c = colorMap[color] || colorMap.neutral;
  return (
    <div style={{
      background: "#f4f4f5",
      borderRadius: 12,
      padding: "24px 12px",
      textAlign: "center",
      border: "1px solid #e4e4e7",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{ fontSize: 32, fontWeight: 800, color: c.value, marginBottom: 8, lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#71717a", fontWeight: 600, lineHeight: 1.4 }}>{label}</div>
    </div>
  );
}

function QuestionCard({ qa, index }) {
  const { status, question, options, selectedAnswer, correctAnswer } = qa;

  const borderColor =
    status === "correct"     ? "#639922" :
    status === "wrong"       ? "#e24b4a" :
                               "#d3d1c7";

  const badgeStyle =
    status === "correct"
      ? { background: "#eaf3de", color: "#3b6d11", border: "1px solid rgba(99,153,34,0.3)" }
      : status === "wrong"
      ? { background: "#fcebeb", color: "#a32d2d", border: "1px solid rgba(226,75,74,0.3)" }
      : { background: "#f5f5f4", color: "#888780", border: "1px solid rgba(161,161,170,0.3)" };

  const badgeText =
    status === "correct" ? "✓ Correct" :
    status === "wrong"   ? "✗ Wrong"   : "— Not Attempted";

  return (
    <div style={{
      background: "#ffffff",
      border: `1px solid #d3d1c7`,
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "16px 20px 10px", gap: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#888780", whiteSpace: "nowrap", marginTop: 2 }}>
          Q{index + 1}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#18181b", flex: 1, lineHeight: 1.5 }}>
          {question}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "4px 12px",
          borderRadius: 20, whiteSpace: "nowrap", ...badgeStyle,
        }}>
          {badgeText}
        </span>
      </div>

      {/* Options */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10, padding: "4px 20px 16px",
      }}>
        {options.map((opt, i) => {
          const isCorrect = opt === correctAnswer;
          const isWrongSelected = opt === selectedAnswer && status === "wrong";
          const optStyle = isCorrect
            ? { background: "#eaf3de", border: "1.5px solid #639922", color: "#27500a" }
            : isWrongSelected
            ? { background: "#fcebeb", border: "1.5px solid #e24b4a", color: "#791f1f" }
            : { background: "#f5f5f4", border: "1px solid #e5e5e3", color: "#3f3f46" };

          return (
            <div key={i} style={{
              fontSize: 14, padding: "12px 16px", borderRadius: 8,
              display: "flex", alignItems: "center", gap: 10, fontWeight: 500, ...optStyle,
            }}>
              <span style={{ fontWeight: 800, minWidth: 20, color: "inherit" }}>{OPTION_KEYS[i]}.</span>
              <span style={{ flex: 1 }}>{opt}</span>
            </div>
          );
        })}
      </div>

      {/* Answer footer */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap",
        padding: "12px 20px",
        borderTop: "1px solid #d3d1c7",
        background: "#fcfcfb",
        alignItems: "center",
      }}>
        {/* Employee selected */}
        {!selectedAnswer ? (
          <span style={{
            fontSize: 12, padding: "6px 12px", borderRadius: 8,
            background: "#f5f5f4", color: "#888780", border: "1px solid rgba(161,161,170,0.2)",
            display: "flex", alignItems: "center", gap: 6, fontWeight: 600,
          }}>
            <span style={{ fontWeight: 800 }}>✗</span>
            <span style={{ opacity: 0.7 }}>Selected:</span> Not Attempted
          </span>
        ) : (
          <span style={{
            fontSize: 12, padding: "6px 12px", borderRadius: 8,
            display: "flex", alignItems: "center", gap: 6, fontWeight: 600,
            ...(status === "correct"
              ? { background: "#eaf3de", color: "#3b6d11", border: "1px solid rgba(99,153,34,0.25)" }
              : { background: "#fcebeb", color: "#a32d2d", border: "1px solid rgba(226,75,74,0.25)" }),
          }}>
            <span style={{ fontWeight: 800 }}>{status === "correct" ? "✓" : "✗"}</span>
            <span style={{ opacity: 0.7 }}>Selected:</span> {selectedAnswer}
          </span>
        )}

        {/* Correct answer (shown when wrong or not attempted) */}
        {status !== "correct" && (
          <span style={{
            fontSize: 12, padding: "6px 12px", borderRadius: 8,
            background: "#eaf3de", color: "#3b6d11", border: "1px solid rgba(99,153,34,0.25)",
            display: "flex", alignItems: "center", gap: 6, fontWeight: 600,
          }}>
            <span style={{ fontWeight: 800 }}>✓</span>
            <span style={{ opacity: 0.7 }}>Correct:</span> {correctAnswer}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main ResultPage ───────────────────────────────────────────

export default function ResultPage() {
  const { examId, employeeId, resultId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        let activeResultId = resultId;

        // If no direct resultId is in URL, query the results list using assessmentId and employeeId
        if (!activeResultId && examId) {
          const listRes = await api.get(`/results?assessmentId=${examId}${employeeId ? `&employeeId=${employeeId}` : ''}`);
          if (listRes.data.success && listRes.data.results && listRes.data.results.length > 0) {
            activeResultId = listRes.data.results[0]._id;
          }
        }

        if (!activeResultId) {
          throw new Error("No result available");
        }

        const res = await api.get(`/exam/result/${activeResultId}`);
        setData(res.data);
        
        // Clean leftover exam state cache so next exam starts completely fresh
        if (examId) {
          localStorage.removeItem(`examState_${examId}`);
        }
      } catch (e) {
        setError(e.response?.data?.error || e.message || "Failed to load result");
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [examId, employeeId, resultId]);

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  if (error || !data) {
    return (
      <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
        <ShieldAlert size={48} color="var(--danger)" />
        <h3>{error || "No result available"}</h3>
        <button className="btn btn-primary" onClick={() => navigate(employeeId ? '/admin/results' : '/employee/dashboard')} style={{ marginTop: 20 }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { exam, employee, summary, submittedAt, durationSeconds, questionAnalysis } = data;
  const passed = summary.passed;
  const durationStr = formatDuration(durationSeconds);

  const handleCopyResult = () => {
    const text = `
🏆 Exam Result: ${exam.title}
👤 Candidate: ${employee?.name}
📊 Score: ${summary.scoreRaw}/${summary.totalQuestions} (${summary.scorePercent}%)
🎯 Status: ${passed ? 'PASSED' : 'FAILED'}
⏱️ Time: ${durationStr}
✅ Correct: ${summary.correctCount}  ✘ Wrong: ${summary.wrongCount}  — Unanswered: ${summary.unattemptedCount}
    `.trim();
    navigator.clipboard.writeText(text);
    toast.success('Result summary copied to clipboard');
  };

  return (
    <div className="animate-fade" style={{ paddingBottom: 60 }}>

      {/* Action panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(employeeId ? '/admin/results' : '/employee/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopyResult}>
            <Copy size={14} /> Copy Summary
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Main card */}
      <div style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '48px 56px 56px',
        background: '#ffffff',
        color: '#18181b',
        borderRadius: 24,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e4e4e7',
        fontFamily: 'Inter, sans-serif',
      }}>

        {/* Center-aligned Title section matching screenshot */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: '#18181b', marginBottom: 8 }}>
            {exam.title}
          </h1>

          <div style={{ fontSize: 13, color: '#71717a', marginBottom: 16 }}>
            Submitted on: {formatDate(submittedAt)}
          </div>

          <span style={{
            fontSize: 11,
            padding: '6px 16px',
            borderRadius: '6px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            display: 'inline-block',
            marginBottom: 24,
            ...(passed
              ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
              : { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' })
          }}>
            {passed ? 'PASSED' : 'FAILED'}
          </span>
        </div>

        {/* Solid green/red progress bar matching screenshot */}
        <div style={{ height: 8, background: '#f4f4f5', borderRadius: 4, overflow: 'hidden', marginBottom: 44 }}>
          <div style={{
            height: '100%',
            width: `${summary.scorePercent}%`,
            background: passed ? '#16a34a' : '#ef4444',
            borderRadius: 4,
            transition: 'width 0.6s ease'
          }} />
        </div>

        {/* ── Stats Row (Separate rounded cards with spacing, matching screenshot) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          marginBottom: 48,
        }}>
          {/* Score */}
          <StatCard
            value={`${summary.scorePercent}%`}
            label={`Score (${summary.scoreRaw}/${summary.totalQuestions})`}
            color={passed ? "green" : "red"}
          />

          {/* Duration */}
          <StatCard
            value={durationStr}
            label={`Duration (${exam.maxDurationMinutes}m max)`}
            color="neutral"
          />

          {/* Correct */}
          <StatCard
            value={summary.correctCount}
            label="Correct Answers"
            color="green"
          />

          {/* Wrong */}
          <StatCard
            value={summary.wrongCount}
            label="Wrong Answers"
            color="red"
          />

          {/* Unanswered */}
          <StatCard
            value={summary.unattemptedCount}
            label="Unanswered"
            color="muted"
          />
        </div>

        {/* ── Question Analysis ── */}
        <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#18181b' }}>
            Question Analysis
          </h3>
        </div>

        {questionAnalysis && questionAnalysis.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questionAnalysis.map((qa, i) => (
              <QuestionCard key={i} qa={qa} index={i} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0 24px', color: '#71717a' }}>
            <p style={{ fontSize: 16, fontWeight: 500 }}>No question analysis available for this exam.</p>
          </div>
        )}

      </div>
    </div>
  );
}
