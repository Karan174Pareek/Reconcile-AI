import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    run_id: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    target_type: {
      type: String,
      enum: ['match', 'exception', 'draft_action', 'agent_query'],
      required: true,
      index: true,
    },
    target_id: {
      type: String,
      default: null,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true, // Application-layer immutability
    },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent updating audit log entries to guarantee append-only audit trail
AuditLogSchema.pre('updateOne', function (next) {
  next(new Error('AuditLog records are append-only and cannot be modified.'));
});

AuditLogSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('AuditLog records are append-only and cannot be modified.'));
});

AuditLogSchema.index({ run_id: 1, target_type: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

export default AuditLog;
