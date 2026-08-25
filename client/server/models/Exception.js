import mongoose from 'mongoose';

const ExceptionSchema = new mongoose.Schema(
  {
    run_id: {
      type: String,
      required: true,
      index: true,
    },
    level: {
      type: Number, // 0, 1, 2
      default: 2,
      index: true,
    },
    bank_record_id: {
      type: String,
      default: null,
      index: true,
    },
    settlement_id: {
      type: String,
      default: null,
      index: true,
    },
    payment_id: {
      type: String,
      default: null,
      index: true,
    },
    order_id: {
      type: String,
      default: null,
      index: true,
    },
    candidate_ledger_ids: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      enum: [
        'mdr_fee',
        'gst_on_mdr',
        'refund_deduction',
        'rounding',
        'partial_settlement',
        'unrecorded',
        'batch_imbalance',
        'duplicate',
        'timing_lag',
        'unknown',
      ],
      required: true,
      index: true,
    },
    expected_amount: {
      type: Number,
      default: 0,
    },
    settled_amount: {
      type: Number,
      default: 0,
    },
    variance_amount: {
      type: Number,
      default: 0,
    },
    variance_breakdown: {
      mdr_fee: { type: Number, default: 0 },
      gst_on_mdr: { type: Number, default: 0 },
      refund: { type: Number, default: 0 },
      rounding: { type: Number, default: 0 },
      unaccounted: { type: Number, default: 0 },
    },
    ai_rationale: {
      type: String,
      default: '',
      trim: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    human_decision: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'manually_resolved'],
      default: 'pending',
      index: true,
    },
    resolved_by: {
      type: String,
      default: null,
    },
    manual_ledger_id: {
      type: String,
      default: null,
    },
    ai_error: {
      type: Boolean,
      default: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ExceptionSchema.index({ run_id: 1, settlement_id: 1 });
ExceptionSchema.index({ run_id: 1, category: 1, human_decision: 1 });

const Exception = mongoose.model('Exception', ExceptionSchema);

export default Exception;
