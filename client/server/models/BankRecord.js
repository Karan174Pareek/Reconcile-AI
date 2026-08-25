import mongoose from 'mongoose';

const BankRecordSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      index: true,
    },
    run_id: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    utr_ref: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    narration: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'matched', 'exception'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for high-speed reconciliation lookups
BankRecordSchema.index({ run_id: 1, status: 1 });
BankRecordSchema.index({ run_id: 1, utr_ref: 1, amount: 1 });

const BankRecord = mongoose.model('BankRecord', BankRecordSchema);

export default BankRecord;
