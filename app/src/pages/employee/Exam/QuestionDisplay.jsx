import React from 'react';
import { QuestionOption } from './QuestionOption';

export const QuestionDisplay = React.memo(({ question, selectedOptions, onSelect }) => {
  if (!question) return null;
  return (
    <>
      <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span className={`badge ${question.difficulty === 'easy' ? 'badge-success' : question.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`}>{question.difficulty}</span>
        <span className="badge badge-primary">{question.marks} marks</span>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32, lineHeight: 1.5, color: 'var(--text-primary)' }}>
        {question.title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {question.options?.map((opt, idx) => (
          <QuestionOption 
            key={idx} 
            opt={opt} 
            idx={idx} 
            selected={selectedOptions?.includes(idx)} 
            questionType={question.type} 
            onSelect={(optionIndex) => onSelect(question._id, optionIndex)} 
          />
        ))}
      </div>
    </>
  );
});
