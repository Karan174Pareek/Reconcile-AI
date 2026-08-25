import mongoose from 'mongoose';

const RunSchema = new mongoose.Schema(
  {
    run_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'complete', 'failed'],
      default: 'pending',
      index: true,
    },
    total_records: {
      type: Number,
      default: 0,
    },
    pass1_matched: {
      type: Number,
      default: 0,
    },
    pass2_matched: {
      type: Number,
      default: 0,
    },
    pass3_matched: {
      type: Number,
      default: 0,
    },
    unresolved: {
      type: Number,
      default: 0,
    },
    match_rate: {
      type: Number,
      default: 0.0,
    },
    // Records whether Pass 3 reasoning used the live Claude API or the
    // deterministic heuristic fallback (no ANTHROPIC_API_KEY configured).
    // Surfaced to the UI so heuristic estimates are never mistaken for live AI.
    ai_mode: {
      type: String,
      enum: ['pending', 'live', 'fallback'],
      default: 'pending',
    },
    // Razorpay 3-level settlement-unpacking metrics (batch-level universe,
    // distinct from the line-item universe used by total_records / pass*_matched).
    level0_matched: {
      type: Number,
      default: 0, // bank credits correlated to a settlement batch (Level 0)
    },
    level0_total: {
      type: Number,
      default: 0, // total bank settlement credits considered at Level 0
    },
    level1_balanced: {
      type: Number,
      default: 0, // batches that passed the Level 1 integrity gate
    },
    level1_flagged: {
      type: Number,
      default: 0, // batches flagged batch_imbalance at Level 1
    },
    level2_matched: {
      type: Number,
      default: 0, // constituent order line items reconciled (deterministic + AI)
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    completed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

RunSchema.index({ created_at: -1 });

const Run = mongoose.model('Run', RunSchema);

export default Run;
