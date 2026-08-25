import mongoose from 'mongoose';

const DraftActionSchema = new mongoose.Schema(
  {
    run_id: {
      type: String,
      required: true,
      index: true,
    },
    exception_id: {
      type: String,
      required: true,
      index: true,
    },
    action_type: {
      type: String,
      enum: ['vendor_email', 'ledger_correction'],
      required: true,
      index: true,
    },
    draft_content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected'],
      default: 'pending_approval',
      index: true,
    },
    executed_at: {
      type: Date,
      default: null,
    },
    was_edited: {
      type: Boolean,
      default: false,
    },
    edited_content: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
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

DraftActionSchema.index({ run_id: 1, status: 1 });

const DraftAction = mongoose.model('DraftAction', DraftActionSchema);

export default DraftAction;
