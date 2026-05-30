import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Check, X } from 'lucide-react';

const STATUS = { CORRECT: 'correct', WRONG: 'wrong', SKIPPED: 'skipped' };

function getStatus(q) {
  if (!q.employeeAnswer && !q.selectedAnswer) return STATUS.SKIPPED;
  const given = q.employeeAnswer ?? q.selectedAnswer ?? '';
  const correct = q.correctAnswer ?? q.answer ?? '';
  return given === correct ? STATUS.CORRECT : STATUS.WRONG;
}

function OptionItem({ letter, text, isCorrect, isWrong }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 12px', borderRadius: 8,
      border: `0.5px solid ${isCorrect ? '#97C459' : isWrong ? '#F09595' : '#E8E6DF'}`,
      background: isCorrect ? '#EAF3DE' : isWrong ? '#FCEBEB' : '#F9F8F5',
      fontSize: 13, color: isCorrect ? '#173404' : isWrong ? '#501313' : '#2C2C2A',
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 600,
        background: isCorrect ? '#3B6D11' : isWrong ? '#A32D2D' : '#fff',
        border: `0.5px solid ${isCorrect ? '#3B6D11' : isWrong ? '#A32D2D' : '#D3D1C7'}`,
        color: (isCorrect || isWrong) ? '#fff' : '#888780',
      }}>{letter}</span>
      <span style={{ flex: 1 }}>{text}</span>
      {isCorrect && <Check size={14} color="#3B6D11" strokeWidth={2.5} />}
      {isWrong && <X size={14} color="#A32D2D" strokeWidth={2.5} />}
    </div>
  );
}

function QuestionCard({ q, index }) {
  const [open, setOpen] = useState(index < 2); // first 2 open by default
  const status = getStatus(q);

  const given = q.employeeAnswer ?? q.selectedAnswer ?? null;
  const correct = q.correctAnswer ?? q.answer ?? null;

  const statusStyles = {
    [STATUS.CORRECT]: { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'CORRECT' },
    [STATUS.WRONG]: { bg: '#FCEBEB', color: '#791F1F', border: '#F09595', label: 'WRONG' },
    [STATUS.SKIPPED]: { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9', label: 'SKIPPED' },
  };
  const ss = statusStyles[status];

  const numBg = {
    [STATUS.CORRECT]: '#EAF3DE', [STATUS.WRONG]: '#FCEBEB', [STATUS.SKIPPED]: '#F1EFE8',
  };
  const numColor = {
    [STATUS.CORRECT]: '#27500A', [STATUS.WRONG]: '#791F1F', [STATUS.SKIPPED]: '#5F5E5A',
  };

  const options = q.options ?? [];

  return (
    <div style={{
      background: '#fff', borderRadius: 12, marginBottom: 10, overflow: 'hidden',
      border: '0.5px solid #E8E6DF',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', cursor: 'pointer',
        }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600,
          background: numBg[status], color: numColor[status],
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        <div style={{ flex: 1, fontSize: 13, color: '#2C2C2A', lineHeight: 1.45 }}>
          {q.question ?? q.questionText ?? q.title ?? `Question ${index + 1}`}
        </div>

        <span style={{
          fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
          letterSpacing: '.3px', marginRight: 6,
          background: ss.bg, color: ss.color, border: `0.5px solid ${ss.border}`,
        }}>
          {ss.label}
        </span>

        {open
          ? <ChevronUp size={16} color="#888780" />
          : <ChevronDown size={16} color="#888780" />}
      </div>

      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '0.5px solid #E8E6DF', paddingTop: 12 }}>

          {options.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: options.length === 4 ? '1fr 1fr' : '1fr',
              gap: 8, marginBottom: 10,
            }}>
              {options.map((opt, i) => {
                const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                const optVal = typeof opt === 'string' ? opt : opt.text ?? opt.value ?? '';
                const isCorrect = optVal === correct;
                const isWrong = optVal === given && given !== correct;
                return (
                  <OptionItem
                    key={i}
                    letter={letters[i] ?? String(i + 1)}
                    text={optVal}
                    isCorrect={isCorrect}
                    isWrong={isWrong}
                  />
                );
              })}
            </div>
          ) : (
            // No options array — show text answer fields
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              <div style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                background: status === STATUS.CORRECT ? '#EAF3DE' : '#FCEBEB',
                border: `0.5px solid ${status === STATUS.CORRECT ? '#97C459' : '#F09595'}`,
                color: status === STATUS.CORRECT ? '#173404' : '#501313',
              }}>
                {given ?? '— not answered'}
              </div>
              {status !== STATUS.CORRECT && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  background: '#EAF3DE', border: '0.5px solid #97C459', color: '#173404',
                }}>
                  <Check size={12} style={{ verticalAlign: -1, marginRight: 5 }} />
                  {correct}
                </div>
              )}
            </div>
          )}

          {/* Answer pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: status === STATUS.CORRECT ? '#EAF3DE'
                : status === STATUS.SKIPPED ? '#F1EFE8' : '#FCEBEB',
              color: status === STATUS.CORRECT ? '#27500A'
                : status === STATUS.SKIPPED ? '#5F5E5A' : '#791F1F',
            }}>
              <span style={{ fontSize: 9, fontWeight: 600, opacity: .7, letterSpacing: '.5px' }}>YOUR</span>
              {given ?? '—'}
            </span>

            {status !== STATUS.CORRECT && correct && (
              <span style={{
                fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#EAF3DE', color: '#27500A',
              }}>
                <span style={{ fontSize: 9, fontWeight: 600, opacity: .7, letterSpacing: '.5px' }}>ANS</span>
                {correct}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestionAnalysis({ questionAnalysis = [] }) {
  if (!questionAnalysis.length) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#888780', fontSize: 14 }}>
      No question data available.
    </div>
  );

  return (
    <div style={{ padding: '0 20px 24px' }}>
      <p style={{
        fontSize: 10, fontWeight: 600, color: '#888780', letterSpacing: '.8px',
        marginBottom: 12, marginTop: 4,
      }}>
        QUESTION ANALYSIS
      </p>
      {questionAnalysis.map((q, i) => (
        <QuestionCard key={q._id ?? q.questionId ?? i} q={q} index={i} />
      ))}
    </div>
  );
}
