import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

import { ResultHeader } from './ResultHeader';
import { ResultStats } from './ResultStats';
import QuestionAnalysis from './QuestionAnalysis';

function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s > 0 ? s + "s" : ""}`.trim() : `${s}s`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

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
    } catch { }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    try {
      const activeResultId = resultId || localStorage.getItem(`lastResultId_${examId}`);
      if (activeResultId) return !localStorage.getItem(`result_detail_${activeResultId}`);
    } catch { }
    return true;
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        let activeResultId = resultId;
        if (!activeResultId && examId) {
          const listRes = await api.get(
            `/results?assessmentId=${examId}${employeeId ? `&employeeId=${employeeId}` : ''}`
          );
          if (listRes.data.success && listRes.data.results?.length > 0) {
            activeResultId = listRes.data.results[0]._id;
          }
        }
        if (!activeResultId) throw new Error("No result available");
        if (activeResultId && examId) localStorage.setItem(`lastResultId_${examId}`, activeResultId);

        const res = await api.get(`/exam/result/${activeResultId}`);
        if (res.data && !res.data.questionAnalysis) res.data.questionAnalysis = [];
        if (res.data && Array.isArray(res.data.questionAnalysis)) {
          res.data.questionAnalysis = [...res.data.questionAnalysis].sort((a, b) =>
            String(a.question || '').localeCompare(String(b.question || ''), undefined, { numeric: true, sensitivity: 'base' })
          );
        }
        setData(res.data);
        localStorage.setItem(`result_detail_${activeResultId}`, JSON.stringify(res.data));
        if (examId) localStorage.removeItem(`examState_${examId}`);
      } catch (e) {
        setError(e.response?.data?.error || e.message || "Failed to load result");
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [examId, employeeId, resultId]);

  // ── Loading skeleton ──
  if (loading) return (
    <div style={{ padding: "24px", paddingBottom: 60 }}>
      <style>{`@keyframes shimmer { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{
          height: i === 0 ? 24 : i === 1 ? 120 : 200,
          background: "#F1EFE8", borderRadius: 12,
          marginBottom: 16, animation: "shimmer 1.5s ease-in-out infinite",
          animationDelay: `${i * 0.15}s`,
        }} />
      ))}
    </div>
  );

  // ── Error state ──
  if (error || !data) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <ShieldAlert size={40} color="#D3D1C7" />
      <p style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: "#2C2C2A" }}>
        {error || "No result available"}
      </p>
      <button
        onClick={() => navigate(window.location.pathname.startsWith('/admin') ? "/admin/results" : "/employee/dashboard")}
        style={{
          marginTop: 20, padding: "10px 24px", borderRadius: 10,
          border: "1px solid #D3D1C7", background: "#fff",
          cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#2C2C2A",
        }}
      >
        Back to {window.location.pathname.startsWith('/admin') ? "Reports" : "Dashboard"}
      </button>
    </div>
  );

  const { exam, employee, summary, submittedAt, startTime, endTime, durationSeconds, questionAnalysis } = data;
  const passed = summary?.passed ?? false;
  const durationStr = formatDuration(durationSeconds);
  const scorePercent = summary?.scorePercent ?? 0;
  
  const startTimeStr = startTime ? new Date(startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
  const endTimeStr = endTime ? new Date(endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

  const handleCopyResult = () => {
    const text = [
      `Exam: ${exam?.title}`,
      `Candidate: ${employee?.name || "—"}`,
      `Score: ${summary?.scoreRaw}/${summary?.totalQuestions} (${scorePercent}%)`,
      `Status: ${passed ? "PASSED" : "FAILED"}`,
      `Time: ${durationStr}`,
      `Correct: ${summary?.correctCount}  Wrong: ${summary?.wrongCount}  Unanswered: ${summary?.unattemptedCount}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Result copied to clipboard");
  };

  return (
    <div style={{
      paddingBottom: 80,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500;700&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .result-page-fade { animation: fadeUp 0.4s ease both; }
        .result-page-fade-1 { animation: fadeUp 0.4s ease 0.05s both; }
        .result-page-fade-2 { animation: fadeUp 0.4s ease 0.1s both; }
        .result-page-fade-3 { animation: fadeUp 0.4s ease 0.15s both; }
        .result-action-btn:hover { background: #F1EFE8 !important; }
        .result-action-btn-primary:hover { background: #27500A !important; }
      `}</style>

      <div style={{
        maxWidth: 820, margin: "0 auto",
        background: "#fff",
        borderRadius: 24,
        border: "1px solid #E8E6DF",
        boxShadow: "0 2px 24px rgba(44,44,42,0.06)",
        overflow: "hidden",
      }}>
        <ResultHeader
          navigate={navigate}
          employeeId={employeeId}
          handleCopyResult={handleCopyResult}
          passed={passed}
          scorePercent={scorePercent}
          exam={exam}
          employee={employee}
          submittedAt={submittedAt}
          formatDate={formatDate}
        />

        <ResultStats
          startTimeStr={startTimeStr}
          endTimeStr={endTimeStr}
          scorePercent={scorePercent}
          summary={summary}
          passed={passed}
          durationStr={durationStr}
          exam={exam}
        />

        <QuestionAnalysis questionAnalysis={questionAnalysis} />
      </div>
    </div>
  );
}
