let ioInstance = null;

/**
 * Register the global Socket.io instance
 * @param {import('socket.io').Server} io
 */
export function registerSocketServer(io) {
  ioInstance = io;
}

/**
 * Get the registered Socket.io server instance
 */
export function getSocketServer() {
  return ioInstance;
}

/**
 * Emits run progress event to room `run:${runId}`
 */
export function emitRunProgress(runId, payload) {
  if (!ioInstance) return;
  ioInstance.to(`run:${runId}`).emit('run:progress', {
    run_id: runId,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

/**
 * Emits pass completion event (Pass 1, Pass 2, Pass 3) to room `run:${runId}`
 */
export function emitPassComplete(runId, payload) {
  if (!ioInstance) return;
  ioInstance.to(`run:${runId}`).emit('run:pass_complete', {
    run_id: runId,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

/**
 * Emits final run completion event to room `run:${runId}`
 */
export function emitRunComplete(runId, payload) {
  if (!ioInstance) return;
  ioInstance.to(`run:${runId}`).emit('run:complete', {
    run_id: runId,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

/**
 * Emits run error event to room `run:${runId}`
 */
export function emitRunError(runId, errorPayload) {
  if (!ioInstance) return;
  ioInstance.to(`run:${runId}`).emit('run:error', {
    run_id: runId,
    timestamp: new Date().toISOString(),
    error: errorPayload,
  });
}
