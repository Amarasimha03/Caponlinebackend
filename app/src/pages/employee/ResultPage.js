import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Download, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ── Helpers ──────────────────────────────────────────────────
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
    day: 'numeric', month: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// ── StatCard ─────────────────────────────────────────────────
function StatCard({ value, label, color }) {
  const colorMap = {
    green: "#3b6d11",
    red: "#a32d2d",
    neutral: "#18181b",
    muted: "#888780",
  };
  return (
    <div style={{
      background: "#f4f4f5", borderRadius: 12, padding: "22px 10px",
      textAlign: "center", border: "1px solid #e4e4e7",
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
    }}>
      <div style={{
        fontSize: 28, fontWeight: 800, lineHeight: 1.1,
        color: colorMap[color] || "#18181b", marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#71717a", fontWeight: 600, lineHeight: 1.4 }}>
        {label}
      </div>
    </div>
  );
}

// ── QuestionCard ──────────────────────────────────────────────
function QuestionCard({ qa, index }) {
  const { status, question, options, selectedAnswer, correctAnswer } = qa;

  // Normalise — handle both index-based and string-based answers
  // Backend may send selectedAnswer as option text OR as option index
  // This handles both cases safely
  const resolveAnswer = (val) => {
    if (val === null || val === undefined) return null;
    // If val is a number (index), map to option text
    if (typeof val === 'number' && options[val] !== undefined) return options[val];
    return String(val);
  };

  const selected = resolveAnswer(selectedAnswer);
  const correct = resolveAnswer(correctAnswer);

  const derivedStatus =
    !selected ? "unattempted" :
      selected === correct ? "correct" : "wrong";

  // Use backend status if provided, else derive
  const finalStatus = status || derivedStatus;

  const borderColor =
    finalStatus === "correct" ? "#639922" :
      finalStatus === "wrong" ? "#e24b4a" : "#d3d1c7";

  const badgeStyle =
    finalStatus === "correct"
      ? { background: "#eaf3de", color: "#3b6d11", border: "1px solid rgba(99,153,34,0.3)" }
      : finalStatus === "wrong"
        ? { background: "#fcebeb", color: "#a32d2d", border: "1px solid rgba(226,75,74,0.3)" }
        : { background: "#f5f5f4", color: "#888780", border: "1px solid rgba(161,161,170,0.3)" };

  const badgeText =
    finalStatus === "correct" ? "Correct" :
      finalStatus === "wrong" ? "Wrong" : "Not Attempted";

  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #d3d1c7",
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "14px 18px 8px", gap: 10,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#888780", whiteSpace: "nowrap", marginTop: 2 }}>
          Q{index + 1}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#18181b", flex: 1, lineHeight: 1.5 }}>
          {question}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 11px",
          borderRadius: 20, whiteSpace: "nowrap", ...badgeStyle,
        }}>
          {badgeText}
        </span>
      </div>

      {/* ── Options grid ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
        gap: 8, padding: "4px 18px 14px",
      }}>
        {(options || []).map((opt, i) => {
          const isCorrectOpt = opt === correct;
          const isWrongSelected = opt === selected && finalStatus === "wrong";
          const optStyle = isCorrectOpt
            ? { background: "#eaf3de", border: "1.5px solid #639922", color: "#27500a" }
            : isWrongSelected
              ? { background: "#fcebeb", border: "1.5px solid #e24b4a", color: "#791f1f" }
              : { background: "#f5f5f4", border: "1px solid #e5e5e3", color: "#3f3f46" };

          return (
            <div key={i} style={{
              fontSize: 13, padding: "10px 14px", borderRadius: 8,
              display: "flex", alignItems: "center", gap: 8,
              fontWeight: 500, ...optStyle,
            }}>
              <span style={{ fontWeight: 800, minWidth: 18, color: "inherit" }}>
                {OPTION_KEYS[i]}.
              </span>
              <span style={{ flex: 1 }}>{opt}</span>
              {isCorrectOpt && (
                <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 12 }}>✓</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer: selected / correct pills ── */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap",
        padding: "10px 18px 14px",
        borderTop: "1px solid #d3d1c7",
        background: "#fcfcfb", alignItems: "center",
      }}>
        {/* Employee's selection */}
        {!selected ? (
          <span style={{
            fontSize: 12, padding: "5px 11px", borderRadius: 8,
            background: "#f5f5f4", color: "#888780",
            border: "1px solid rgba(161,161,170,0.2)",
            display: "flex", alignItems: "center", gap: 5, fontWeight: 600,
          }}>
            <span style={{ fontWeight: 800 }}>✗</span>
            <span style={{ opacity: 0.7 }}>Selected:</span> Not Attempted
          </span>
        ) : (
          <span style={{
            fontSize: 12, padding: "5px 11px", borderRadius: 8,
            display: "flex", alignItems: "center", gap: 5, fontWeight: 600,
            ...(finalStatus === "correct"
              ? { background: "#eaf3de", color: "#3b6d11", border: "1px solid rgba(99,153,34,0.25)" }
              : { background: "#fcebeb", color: "#a32d2d", border: "1px solid rgba(226,75,74,0.25)" }),
          }}>
            <span style={{ fontWeight: 800 }}>{finalStatus === "correct" ? "✓" : "✗"}</span>
            <span style={{ opacity: 0.7 }}>Selected:</span> {selected}
          </span>
        )}

        {/* Correct answer — only shown when wrong or unattempted */}
        {finalStatus !== "correct" && (
          <span style={{
            fontSize: 12, padding: "5px 11px", borderRadius: 8,
            background: "#eaf3de", color: "#3b6d11",
            border: "1px solid rgba(99,153,34,0.25)",
            display: "flex", alignItems: "center", gap: 5, fontWeight: 600,
          }}>
            <span style={{ fontWeight: 800 }}>✓</span>
            <span style={{ opacity: 0.7 }}>Correct:</span> {correct}
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
  const [data, setData] = useState(() => {
    try {
      const activeResultId = resultId || localStorage.getItem(`lastResultId_${examId}`);
      if (activeResultId) {
        const cached = localStorage.getItem(`result_detail_${activeResultId}`);
        return cached ? JSON.parse(cached) : null;
      }
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(() => {
    try {
      const activeResultId = resultId || localStorage.getItem(`lastResultId_${examId}`);
      if (activeResultId) {
        return !localStorage.getItem(`result_detail_${activeResultId}`);
      }
    } catch {}
    return true;
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        let activeResultId = resultId;

        // Fallback: find result via examId + employeeId
        if (!activeResultId && examId) {
          const listRes = await api.get(
            `/results?assessmentId=${examId}${employeeId ? `&employeeId=${employeeId}` : ''}`
          );
          if (listRes.data.success && listRes.data.results?.length > 0) {
            activeResultId = listRes.data.results[0]._id;
          }
        }

        if (!activeResultId) throw new Error("No result available");

        if (activeResultId && examId) {
          localStorage.setItem(`lastResultId_${examId}`, activeResultId);
        }

        const res = await api.get(`/exam/result/${activeResultId}`);

        // ── Guard: ensure questionAnalysis always exists ──
        if (res.data && !res.data.questionAnalysis) {
          res.data.questionAnalysis = [];
        }

        if (res.data && Array.isArray(res.data.questionAnalysis)) {
          res.data.questionAnalysis = [...res.data.questionAnalysis].sort((a, b) =>
            String(a.question || '').localeCompare(String(b.question || ''), undefined, { numeric: true, sensitivity: 'base' })
          );
        }

        setData(res.data);
        localStorage.setItem(`result_detail_${activeResultId}`, JSON.stringify(res.data));

        // Clear cached exam state
        if (examId) localStorage.removeItem(`examState_${examId}`);

      } catch (e) {
        setError(e.response?.data?.error || e.message || "Failed to load result");
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [examId, employeeId, resultId]);

  // ── Loading state ──
  if (loading) return (
    <div className="loading-center">
      <div className="loading-spinner" />
    </div>
  );

  // ── Error state ──
  if (error || !data) return (
    <div className="empty-state" style={{ padding: 40, textAlign: "center" }}>
      <ShieldAlert size={48} color="var(--danger)" />
      <h3 style={{ marginTop: 12 }}>{error || "No result available"}</h3>
      <button
        className="btn btn-primary"
        onClick={() => navigate(employeeId ? "/admin/results" : "/employee/dashboard")}
        style={{ marginTop: 20 }}
      >
        Back to Dashboard
      </button>
    </div>
  );

  const { exam, employee, summary, submittedAt, durationSeconds, questionAnalysis } = data;
  const passed = summary?.passed ?? false;
  const durationStr = formatDuration(durationSeconds);

  // ── Copy summary to clipboard ──
  const handleCopyResult = () => {
    const text = [
      `Exam Result: ${exam?.title}`,
      `Candidate:   ${employee?.name || "—"}`,
      `Score:       ${summary?.scoreRaw}/${summary?.totalQuestions} (${summary?.scorePercent}%)`,
      `Status:      ${passed ? "PASSED" : "FAILED"}`,
      `Time:        ${durationStr}`,
      `Correct: ${summary?.correctCount}   Wrong: ${summary?.wrongCount}   Unanswered: ${summary?.unattemptedCount}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Result summary copied to clipboard");
  };

  return (
    <div className="animate-fade" style={{ paddingBottom: 60 }}>

      {/* ── Action bar ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, flexWrap: "wrap", gap: 12,
      }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(employeeId ? "/admin/results" : "/employee/dashboard")}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopyResult}>
            <Copy size={14} /> Copy Summary
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* ── Main card ── */}
      <div style={{
        maxWidth: 860, margin: "0 auto",
        padding: "40px 48px 52px",
        background: "#ffffff", color: "#18181b",
        borderRadius: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.05)",
        border: "1px solid #e4e4e7",
        fontFamily: "Inter, sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{
            fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em",
            color: "#18181b", marginBottom: 6,
          }}>
            {exam?.title}
          </h1>

          {employee?.name && (
            <div style={{ fontSize: 13, color: "#71717a", marginBottom: 4 }}>
              {employee.name}{employee.department ? ` · ${employee.department}` : ""}
            </div>
          )}

          <div style={{ fontSize: 13, color: "#71717a", marginBottom: 14 }}>
            Submitted on: {formatDate(submittedAt)}
          </div>

          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
            padding: "5px 16px", borderRadius: 6,
            display: "inline-block", marginBottom: 22,
            ...(passed
              ? { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }
              : { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" }),
          }}>
            {passed ? "PASSED" : "FAILED"}
          </span>
        </div>

        {/* ── Progress bar ── */}
        <div style={{
          height: 8, background: "#f4f4f5", borderRadius: 4,
          overflow: "hidden", marginBottom: 40,
        }}>
          <div style={{
            height: "100%", borderRadius: 4,
            width: `${summary?.scorePercent ?? 0}%`,
            background: passed ? "#16a34a" : "#ef4444",
            transition: "width 0.8s ease",
          }} />
        </div>

        {/* ── Stats grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10, marginBottom: 44,
        }}>
          <StatCard
            value={`${summary?.scorePercent ?? 0}%`}
            label={`Score (${summary?.scoreRaw}/${summary?.totalQuestions})`}
            color={passed ? "green" : "red"}
          />
          <StatCard
            value={durationStr}
            label={`Duration (${exam?.maxDurationMinutes ?? "—"}m max)`}
            color="neutral"
          />
          <StatCard value={summary?.correctCount} label="Correct Answers" color="green" />
          <StatCard value={summary?.wrongCount} label="Wrong Answers" color="red" />
          <StatCard value={summary?.unattemptedCount} label="Unanswered" color="muted" />
        </div>

        {/* ── Question Analysis ── */}
        <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 22, marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#18181b" }}>
            Question Analysis
          </h3>
        </div>

        {questionAnalysis && questionAnalysis.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {questionAnalysis.map((qa, i) => (
              <QuestionCard key={qa.questionId || i} qa={qa} index={i} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0 20px", color: "#71717a" }}>
            <ShieldAlert size={36} color="#d3d1c7" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              Question analysis not available
            </p>
            <p style={{ fontSize: 13 }}>
              This result was submitted before question tracking was enabled.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}