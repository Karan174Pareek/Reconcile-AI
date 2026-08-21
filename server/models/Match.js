import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema(
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
    ledger_record_id: {
      type: String,
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ['exact', 'fuzzy', 'ai'],
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

MatchSchema.index({ run_id: 1, method: 1 });

const Match = mongoose.model('Match', MatchSchema);

export default Match;
