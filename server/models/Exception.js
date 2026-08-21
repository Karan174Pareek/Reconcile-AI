import mongoose from 'mongoose';

const ExceptionSchema = new mongoose.Schema(
  {
    run_id: {
      type: String,
      required: true,
      index: true,
    },
    bank_record_id: {
      type: String,
      required: true,
      index: true,
    },
    candidate_ledger_ids: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      enum: [
        'duplicate',
        'refund',
        'bank_fee',
        'timing_lag',
        'unrecorded',
        'unknown',
      ],
      required: true,
      index: true,
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

ExceptionSchema.index({ run_id: 1, category: 1, human_decision: 1 });

const Exception = mongoose.model('Exception', ExceptionSchema);

export default Exception;
