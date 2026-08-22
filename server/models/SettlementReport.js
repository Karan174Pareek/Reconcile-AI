import mongoose from 'mongoose';

const SettlementReportSchema = new mongoose.Schema(
  {
    run_id: {
      type: String,
      required: true,
      index: true,
    },
    settlement_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number, // net settled amount in INR (or paise / 100)
      required: true,
    },
    gross_amount: {
      type: Number,
      default: 0,
    },
    fees: {
      type: Number, // total MDR fees in INR
      default: 0,
    },
    tax: {
      type: Number, // total 18% GST on MDR in INR
      default: 0,
    },
    refunds: {
      type: Number, // total refund deductions in INR
      default: 0,
    },
    utr: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['created', 'processed', 'settled', 'failed'],
      default: 'settled',
    },
    settled_at: {
      type: Date,
      required: true,
      index: true,
    },
    item_count: {
      type: Number,
      default: 0,
    },
    integrity_status: {
      type: String,
      enum: ['pending', 'balanced', 'imbalanced'],
      default: 'pending',
    },
    integrity_difference: {
      type: Number,
      default: 0,
    },
    bank_record_id: {
      type: String,
      default: null,
      index: true,
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

SettlementReportSchema.index({ run_id: 1, settled_at: 1 });
SettlementReportSchema.index({ run_id: 1, utr: 1 });

const SettlementReport = mongoose.model('SettlementReport', SettlementReportSchema);

export default SettlementReport;
