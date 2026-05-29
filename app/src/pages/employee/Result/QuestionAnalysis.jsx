import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { SectionLabel } from './ResultStats';
import { QuestionCard } from './QuestionCard';

export function QuestionAnalysis({ questionAnalysis }) {
  return (
    <div className="result-page-fade-3" style={{ padding: "0 44px 44px" }}>
      <SectionLabel>Question analysis</SectionLabel>

      {questionAnalysis && questionAnalysis.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {questionAnalysis.map((qa, i) => (
            <QuestionCard key={qa.questionId || i} qa={qa} index={i} />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: "center", padding: "48px 0 20px",
          color: "#888780",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: "#F1EFE8",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <ShieldAlert size={26} color="#B4B2A9" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#2C2C2A", margin: "0 0 6px" }}>
            No question analysis available
          </p>
          <p style={{ fontSize: 13, color: "#888780", margin: 0 }}>
            Detailed breakdown of answers was not found for this attempt.
          </p>
        </div>
      )}
    </div>
  );
}
