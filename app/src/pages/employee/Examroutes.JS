// ─────────────────────────────────────────────────────────────
//  examRoutes.js  –  Backend API for Exam Submission & Results
//  Express + Mongoose (adapt to your ORM/DB as needed)
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const ExamResult = require("./models/ExamResult");   // see schema below
const Exam = require("./models/Exam");               // your existing Exam model

// ─────────────────────────────────
//  POST /api/exam/submit
//  Called when employee submits exam
// ─────────────────────────────────
router.post("/submit", async (req, res) => {
    try {
        const { examId, employeeId, answers, durationSeconds } = req.body;
        // answers = [{ questionId, selectedOption }]  (selectedOption = null if skipped)

        const exam = await Exam.findById(examId).populate("questions");
        if (!exam) return res.status(404).json({ error: "Exam not found" });

        let correctCount = 0;
        let wrongCount = 0;
        let unattemptedCount = 0;

        // Build rich question analysis
        const questionAnalysis = exam.questions.map((q) => {
            const ans = answers.find((a) => a.questionId.toString() === q._id.toString());
            const selectedAnswer = ans?.selectedOption ?? null;
            const correctAnswer = q.correctOption;
            let isCorrect = false;
            let status = "unattempted";

            if (selectedAnswer === null || selectedAnswer === undefined) {
                unattemptedCount++;
                status = "unattempted";
            } else if (selectedAnswer === correctAnswer) {
                correctCount++;
                isCorrect = true;
                status = "correct";
            } else {
                wrongCount++;
                status = "wrong";
            }

            return {
                questionId: q._id,
                question: q.questionText,
                options: q.options,            // Array of strings e.g. ["Java Virtual Machine", ...]
                selectedAnswer,                // string or null
                correctAnswer,                 // string
                isCorrect,
                status,                        // "correct" | "wrong" | "unattempted"
            };
        });

        const totalQuestions = exam.questions.length;
        const scoreRaw = correctCount;
        const scorePercent = Math.round((correctCount / totalQuestions) * 100);
        const passed = scorePercent >= exam.passingScore;

        // Persist result
        const result = await ExamResult.create({
            examId,
            employeeId,
            questionAnalysis,
            correctCount,
            wrongCount,
            unattemptedCount,
            totalQuestions,
            scoreRaw,
            scorePercent,
            passed,
            durationSeconds,
            submittedAt: new Date(),
        });

        res.status(201).json({ resultId: result._id, passed, scorePercent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Submission failed" });
    }
});

// ─────────────────────────────────
//  GET /api/exam/result/:resultId
//  Fetch full result for Result Page
//  Works for both employee and admin
// ─────────────────────────────────
router.get("/result/:resultId", async (req, res) => {
    try {
        const result = await ExamResult.findById(req.params.resultId)
            .populate("examId", "title passingScore durationMinutes")
            .populate("employeeId", "name email department");

        if (!result) return res.status(404).json({ error: "Result not found" });

        res.json({
            resultId: result._id,
            exam: {
                title: result.examId.title,
                passingScore: result.examId.passingScore,
                maxDurationMinutes: result.examId.durationMinutes,
            },
            employee: {
                name: result.employeeId.name,
                email: result.employeeId.email,
                department: result.employeeId.department,
            },
            submittedAt: result.submittedAt,
            durationSeconds: result.durationSeconds,
            summary: {
                totalQuestions: result.totalQuestions,
                correctCount: result.correctCount,
                wrongCount: result.wrongCount,
                unattemptedCount: result.unattemptedCount,
                scoreRaw: result.scoreRaw,
                scorePercent: result.scorePercent,
                passed: result.passed,
            },
            // Full question analysis – the key part
            questionAnalysis: result.questionAnalysis.map((qa, index) => ({
                questionNumber: index + 1,
                question: qa.question,
                options: qa.options,
                selectedAnswer: qa.selectedAnswer,   // null if not attempted
                correctAnswer: qa.correctAnswer,
                isCorrect: qa.isCorrect,
                status: qa.status,                   // "correct" | "wrong" | "unattempted"
            })),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch result" });
    }
});

// ─────────────────────────────────
//  GET /api/exam/results?examId=&employeeId=
//  Admin: list all results for an exam or employee
// ─────────────────────────────────
router.get("/results", async (req, res) => {
    try {
        const filter = {};
        if (req.query.examId) filter.examId = req.query.examId;
        if (req.query.employeeId) filter.employeeId = req.query.employeeId;

        const results = await ExamResult.find(filter)
            .populate("examId", "title")
            .populate("employeeId", "name email department")
            .sort({ submittedAt: -1 })
            .select("-questionAnalysis");

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch results" });
    }
});

module.exports = router;