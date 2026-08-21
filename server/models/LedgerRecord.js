import mongoose from 'mongoose';

const LedgerRecordSchema = new mongoose.Schema(
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
    invoice_ref: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    payee: {
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

// Compound indexes for reconciliation queries
LedgerRecordSchema.index({ run_id: 1, status: 1 });
LedgerRecordSchema.index({ run_id: 1, invoice_ref: 1, amount: 1 });

const LedgerRecord = mongoose.model('LedgerRecord', LedgerRecordSchema);

export default LedgerRecord;
