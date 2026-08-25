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
      enum: ['match', 'exception', 'draft_action', 'agent_query', 'settlement'],
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

// Prevent updating or deleting audit log entries to guarantee append-only audit trail
AuditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace'], function (next) {
  next(new Error('AuditLog records are strictly append-only and cannot be modified.'));
});

AuditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function (next) {
  next(new Error('AuditLog records are strictly append-only and cannot be deleted.'));
});

AuditLogSchema.index({ run_id: 1, target_type: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

export default AuditLog;
