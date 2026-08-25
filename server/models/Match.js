import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema(
  {
    run_id: {
      type: String,
      required: true,
      index: true,
    },
    level: {
      type: Number, // 0: Bank<->Settlement, 1: Batch Integrity, 2: LineItem<->Order
      enum: [0, 1, 2],
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
    ledger_record_id: {
      type: String,
      default: null,
      index: true,
    },
    method: {
      type: String,
      enum: ['exact', 'fuzzy', 'ai', 'heuristic', 'batch_integrity'],
      required: true,
      index: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    rationale: {
      type: String,
      required: true,
      trim: true,
    },
    variance_category: {
      type: String,
      enum: [
        'none',
        'mdr_fee',
        'gst_on_mdr',
        'refund_deduction',
        'rounding',
        'partial_settlement',
        'unrecorded',
        'unknown',
      ],
      default: 'none',
    },
    variance_amount: {
      type: Number,
      default: 0,
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

MatchSchema.index({ run_id: 1, level: 1, method: 1 });
MatchSchema.index({ run_id: 1, settlement_id: 1 });

const Match = mongoose.model('Match', MatchSchema);

export default Match;
