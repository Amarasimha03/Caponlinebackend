import React, { useState } from 'react';

const OPTION_KEYS = ["A", "B", "C", "D", "E"];

export const QuestionCard = React.memo(({ qa, index }) => {
  const { status, question, options, selectedAnswer, correctAnswer } = qa;
  const [isOpen, setIsOpen] = useState(true);

  const resolveAnswer = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number' && options[val] !== undefined) return options[val];
    return String(val);
  };

  const selected = resolveAnswer(selectedAnswer);
  const correct = resolveAnswer(correctAnswer);

  const isUnattempted = selected === null || selected === undefined || selected === "";
  const finalStatus = status || (
    isUnattempted ? "unattempted" :
      selected === correct ? "correct" : "wrong"
  );

  const palette = {
    correct: { stripe: "#639922", badge: { bg: "#EAF3DE", color: "#27500A" }, label: "Correct" },
    wrong: { stripe: "#E24B4A", badge: { bg: "#FCEBEB", color: "#791F1F" }, label: "Wrong" },
    unattempted: { stripe: "#D3D1C7", badge: { bg: "#F1EFE8", color: "#5F5E5A" }, label: "Skipped" },
  };
  const p = palette[finalStatus];

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E8E6DF",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      {/* Thin top stripe */}
      <div style={{ height: 3, background: p.stripe }} />

      {/* Header row */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 14,
          padding: "14px 18px",
          cursor: "pointer", userSelect: "none",
        }}
      >
        {/* Index chip */}
        <div style={{
          minWidth: 28, height: 28, borderRadius: 8,
          background: "#F1EFE8",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "#5F5E5A",
          fontFamily: "'DM Mono', monospace", marginTop: 1, flexShrink: 0,
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        <span style={{
          flex: 1, fontSize: 14, fontWeight: 500,
          color: "#1A1A18", lineHeight: 1.55,
        }}>
          {question}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 20,
            ...p.badge,
          }}>
            {p.label}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.4 }}
          >
            <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Expanded body */}
      {isOpen && (
        <div style={{ borderTop: "1px solid #EDEBE5" }}>
          {/* Options */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8, padding: "14px 18px",
          }}>
            {(options || []).map((opt, i) => {
              const isCorrectOpt = opt === correct;
              const isWrongSel = opt === selected && finalStatus === "wrong";

              const optStyle = isCorrectOpt
                ? { background: "#EAF3DE", border: "1.5px solid #97C459", color: "#27500A" }
                : isWrongSel
                  ? { background: "#FCEBEB", border: "1.5px solid #F09595", color: "#791F1F" }
                  : { background: "#FAFAF8", border: "1px solid #E8E6DF", color: "#3F3E3B" };

              return (
                <div key={i} style={{
                  fontSize: 13, padding: "10px 13px", borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 8, fontWeight: 500,
                  ...optStyle,
                }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10, fontWeight: 700, opacity: 0.6, minWidth: 16,
                  }}>
                    {OPTION_KEYS[i]}
                  </span>
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{opt}</span>
                  {isCorrectOpt && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M2.5 7.5L5.5 10.5L11.5 4.5" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isWrongSel && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="#A32D2D" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          {/* Answer summary footer */}
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap",
            padding: "10px 18px 14px",
            background: "#FAFAF8",
            borderTop: "1px solid #EDEBE5",
          }}>
            <span style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 8, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5,
              ...(finalStatus === "correct"
                ? { background: "#EAF3DE", color: "#27500A" }
                : finalStatus === "wrong"
                  ? { background: "#FCEBEB", color: "#791F1F" }
                  : { background: "#F1EFE8", color: "#5F5E5A" }),
            }}>
              <span style={{ fontFamily: "'DM Mono', monospace", opacity: 0.6, fontSize: 10 }}>YOUR</span>
              {isUnattempted ? "Not attempted" : selected}
            </span>

            {finalStatus !== "correct" && (
              <span style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 8,
                background: "#EAF3DE", color: "#27500A", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{ fontFamily: "'DM Mono', monospace", opacity: 0.6, fontSize: 10 }}>ANS</span>
                {correct}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
