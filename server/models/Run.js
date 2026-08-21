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
