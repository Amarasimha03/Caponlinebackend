const mongoose = require('../utils/localCache');

const violationSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  result: { type: mongoose.Schema.Types.ObjectId, ref: 'Result' },
  type: { type: String, required: true },
  description: { type: String },
  screenshot: { type: String },
  timestamp: { type: Date, default: Date.now },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  deviceInfo: {
    browser: { type: String },
    os: { type: String },
    ip: { type: String },
  },
}, { timestamps: true });

// Index for fast lookups by employee+assessment
violationSchema.index({ employee: 1, assessment: 1 });
violationSchema.index({ result: 1 });

module.exports = mongoose.model('Violation', violationSchema);
