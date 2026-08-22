import React from 'react';
import AuditLog from '../components/AuditLog.jsx';

export default function AuditLogPage({ runId }) {
  return (
    <div className="space-y-6">
      <AuditLog runId={runId} />
    </div>
  );
}
