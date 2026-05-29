import React from 'react';

export const StatCard = React.memo(({ value, label, sublabel, accent }) => {
  const accents = {
    green: { val: "#27500A", sub: "#3B6D11", bg: "#EAF3DE", bar: "#639922" },
    red: { val: "#791F1F", sub: "#A32D2D", bg: "#FCEBEB", bar: "#E24B4A" },
    neutral: { val: "#2C2C2A", sub: "#5F5E5A", bg: "#F1EFE8", bar: "#888780" },
    muted: { val: "#444441", sub: "#888780", bg: "#F1EFE8", bar: "#B4B2A9" },
  };
  const c = accents[accent] || accents.neutral;
  
  return (
    <div style={{
      background: c.bg,
      borderRadius: 16,
      padding: "20px 16px 18px",
      display: "flex", flexDirection: "column",
      gap: 6, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 3, background: "rgba(0,0,0,0.06)",
      }}>
        <div style={{ height: "100%", width: "60%", background: c.bar, borderRadius: "0 2px 2px 0" }} />
      </div>
      <div style={{
        fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em",
        color: c.val, fontFamily: "'DM Mono', monospace",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: c.sub, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.3 }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: 10, color: c.sub, opacity: 0.7, lineHeight: 1.2 }}>{sublabel}</div>
      )}
    </div>
  );
});

export const SectionLabel = ({ children }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
  }}>
    <span style={{
      fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em",
      color: "#888780",
    }}>{children}</span>
    <div style={{ flex: 1, height: "1px", background: "#E8E6DF" }} />
  </div>
);

export function ResultStats({ startTimeStr, endTimeStr, scorePercent, summary, passed, durationStr, exam }) {
  return (
    <div className="result-page-fade-2" style={{ padding: "28px 44px" }}>
      <SectionLabel>Performance summary</SectionLabel>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 10,
      }}>
        <StatCard value={startTimeStr} label="Started" accent="muted" />
        <StatCard value={endTimeStr} label="Finished" accent="muted" />
        <StatCard
          value={`${scorePercent}%`}
          label="Score"
          sublabel={`${summary?.scoreRaw} of ${summary?.totalQuestions} pts`}
          accent={passed ? "green" : "red"}
        />
        <StatCard
          value={durationStr}
          label="Duration"
          sublabel={`${exam?.maxDurationMinutes ?? "—"}m allowed`}
          accent="neutral"
        />
        <StatCard value={summary?.correctCount ?? 0} label="Correct" accent="green" />
        <StatCard value={summary?.wrongCount ?? 0} label="Wrong" accent="red" />
        <StatCard value={summary?.unattemptedCount ?? 0} label="Skipped" accent="muted" />
      </div>
    </div>
  );
}
