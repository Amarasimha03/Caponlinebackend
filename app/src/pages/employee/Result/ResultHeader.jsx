import React from 'react';
import { ArrowLeft, Copy, Download } from 'lucide-react';

export function ResultHeader({ navigate, employeeId, handleCopyResult, passed, scorePercent, exam, employee, submittedAt, formatDate }) {
  return (
    <>
      {/* ── Top action bar ── */}
      <div className="result-page-fade" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 28, flexWrap: "wrap", gap: 12,
      }}>
        <button
          className="result-action-btn"
          onClick={() => navigate(employeeId ? "/admin/results" : "/employee/dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 10,
            border: "1px solid #D3D1C7", background: "#fff",
            cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#5F5E5A",
            transition: "background 0.15s",
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="result-action-btn"
            onClick={handleCopyResult}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px", borderRadius: 10,
              border: "1px solid #D3D1C7", background: "#fff",
              cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#5F5E5A",
              transition: "background 0.15s",
            }}
          >
            <Copy size={13} /> Copy
          </button>
          <button
            className="result-action-btn-primary"
            onClick={() => window.print()}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 10,
              border: "none", background: "#3B6D11",
              cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff",
              transition: "background 0.15s",
            }}
          >
            <Download size={13} /> PDF
          </button>
        </div>
      </div>

      {/* ── Hero band ── */}
      <div className="result-page-fade-1" style={{
        padding: "36px 44px 32px",
        background: passed ? "#EAF3DE" : "#FCEBEB",
        borderBottom: `3px solid ${passed ? "#639922" : "#E24B4A"}`,
        position: "relative",
      }}>
        <div style={{
          position: "absolute", right: 36, top: "50%", transform: "translateY(-50%)",
          fontFamily: "'DM Mono', monospace",
          fontSize: 88, fontWeight: 700, lineHeight: 1,
          color: passed ? "rgba(99,153,34,0.12)" : "rgba(226,75,74,0.12)",
          userSelect: "none", pointerEvents: "none",
          letterSpacing: "-0.04em",
        }}>
          {scorePercent}%
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <div style={{
            flexShrink: 0,
            width: 52, height: 52, borderRadius: 14,
            background: passed ? "#639922" : "#E24B4A",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {passed ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13L9.5 17.5L19 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M6 6L16 16M16 6L6 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{
                fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em",
                color: "#1A1A18", margin: 0, lineHeight: 1.2,
              }}>
                {exam?.title}
              </h1>
              <span style={{
                fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 20,
                background: passed ? "#3B6D11" : "#A32D2D",
                color: "#fff",
              }}>
                {passed ? "Passed" : "Failed"}
              </span>
            </div>

            {employee?.name && (
              <div style={{ fontSize: 13, color: "#5F5E5A", marginBottom: 3 }}>
                {employee.name}{employee.department ? ` · ${employee.department}` : ""}
              </div>
            )}

            <div style={{
              fontSize: 12, color: "#888780",
              fontFamily: "'DM Mono', monospace",
            }}>
              {formatDate(submittedAt)}
            </div>
          </div>
        </div>

        {/* Score progress bar */}
        <div style={{
          marginTop: 24,
          height: 6, background: passed ? "rgba(99,153,34,0.2)" : "rgba(226,75,74,0.2)",
          borderRadius: 3, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${scorePercent}%`,
            background: passed ? "#639922" : "#E24B4A",
            transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 6, fontSize: 11, color: passed ? "#3B6D11" : "#A32D2D",
          fontFamily: "'DM Mono', monospace", fontWeight: 600,
        }}>
          <span>0%</span>
          <span style={{ fontWeight: 800 }}>{scorePercent}% achieved</span>
          <span>100%</span>
        </div>
      </div>
    </>
  );
}
