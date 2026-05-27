// ─────────────────────────────────────────────────────────────
//  models/ExamResult.js  –  Mongoose Schema
//  Stores complete question analysis per submission
// ─────────────────────────────────────────────────────────────

const mongoose = require("../utils/localCache");

const questionAnalysisSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    question:       { type: String, required: true },
    options:        { type: [String], required: true },   // All MCQ options
    selectedAnswer: { type: String, default: null },      // null = not attempted
    correctAnswer:  { type: String, required: true },
    isCorrect:      { type: Boolean, default: false },
    status:         { type: String, enum: ["correct", "wrong", "unattempted"], required: true },
  },
  { _id: false }
);

const examResultSchema = new mongoose.Schema(
  {
    examId:      { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
    employeeId:  { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },

    // ── Full question analysis (the key data) ──
    questionAnalysis: { type: [questionAnalysisSchema], required: true },

    // ── Summary stats ──
    totalQuestions:   { type: Number, required: true },
    correctCount:     { type: Number, default: 0 },
    wrongCount:       { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 0 },
    scoreRaw:         { type: Number, default: 0 },       // correct answers count
    scorePercent:     { type: Number, default: 0 },       // 0-100
    passed:           { type: Boolean, default: false },

    durationSeconds:  { type: Number },
    submittedAt:      { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for fast lookups by exam and employee
examResultSchema.index({ examId: 1, employeeId: 1 });
examResultSchema.index({ employeeId: 1, submittedAt: -1 });

module.exports = mongoose.model("ExamResult", examResultSchema);
