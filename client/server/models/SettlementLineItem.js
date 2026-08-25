import mongoose from 'mongoose';

const SettlementLineItemSchema = new mongoose.Schema(
  {
    run_id: {
      type: String,
      required: true,
      index: true,
    },
    settlement_id: {
      type: String,
      required: true,
      index: true,
    },
    payment_id: {
      type: String,
      required: true,
      index: true,
    },
    order_id: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['payment', 'refund', 'adjustment', 'transfer'],
      default: 'payment',
      index: true,
    },
    amount: {
      type: Number, // Gross amount in INR
      required: true,
    },
    fee: {
      type: Number, // MDR fee deducted in INR
      default: 0,
    },
    tax: {
      type: Number, // 18% GST on MDR fee in INR
      default: 0,
    },
    debit: {
      type: Number, // Deductions (fees + tax + refund amounts)
      default: 0,
    },
    credit: {
      type: Number, // Gross credit to merchant
      default: 0,
    },
    net_amount: {
      type: Number, // credit - debit
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    settled_at: {
      type: Date,
      required: true,
    },
    unpacked_status: {
      type: String,
      enum: ['pending', 'matched', 'variance_flagged', 'unrecorded'],
      default: 'pending',
      index: true,
    },
    ledger_record_id: {
      type: String,
      default: null,
      index: true,
    },
    variance_category: {
      type: String,
      enum: [
        'mdr_fee',
        'gst_on_mdr',
        'refund_deduction',
        'rounding',
        'partial_settlement',
        'unrecorded',
        'none',
        'unknown',
      ],
      default: 'none',
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

SettlementLineItemSchema.index({ run_id: 1, settlement_id: 1 });
SettlementLineItemSchema.index({ run_id: 1, order_id: 1 });

const SettlementLineItem = mongoose.model('SettlementLineItem', SettlementLineItemSchema);

export default SettlementLineItem;
