import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || '';
const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : '/api';

export function useRunSocket(runId) {
  const [runData, setRunData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveProgress, setLiveProgress] = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const pollingTimerRef = useRef(null);

  // Fetch run details from REST API
  const fetchRun = useCallback(async (idToFetch) => {
    const id = idToFetch || runId;
    if (!id) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/runs/${id}`);
      if (res.data && res.data.data) {
        setRunData(res.data.data.run);
      }
    } catch (err) {
      console.warn('[useRunSocket] Fetch run notice:', err.message);
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (!runId) return;

    fetchRun(runId);

    const isVercelProduction =
      !SOCKET_URL ||
      (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));

    // In Vercel serverless production: Polling is the primary mechanism (Option A)
    if (isVercelProduction) {
      setIsConnected(true);
      pollingTimerRef.current = setInterval(() => {
        fetchRun(runId);
      }, 2500);

      return () => {
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      };
    }

    // In local Node development: Connect via Socket.io
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_run', runId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('run:progress', (data) => {
      setLiveProgress(data);
      setLiveEvents((prev) => [
        { id: Date.now(), type: 'progress', message: data.message, timestamp: data.timestamp },
        ...prev.slice(0, 19),
      ]);
    });

    socket.on('run:pass_complete', (data) => {
      setLiveProgress(data);
      setLiveEvents((prev) => [
        { id: Date.now(), type: 'pass_complete', message: data.message, timestamp: data.timestamp },
        ...prev.slice(0, 19),
      ]);
      fetchRun(runId);
    });

    socket.on('run:complete', (data) => {
      setLiveProgress({ percentage: 100, message: data.message, stage: 'complete' });
      setLiveEvents((prev) => [
        { id: Date.now(), type: 'complete', message: data.message, timestamp: data.timestamp },
        ...prev.slice(0, 19),
      ]);
      fetchRun(runId);
    });

    socket.on('run:error', (data) => {
      setError(data.error?.message || 'Reconciliation run error');
      setLiveEvents((prev) => [
        { id: Date.now(), type: 'error', message: data.error?.message || 'Error occurred', timestamp: data.timestamp },
        ...prev.slice(0, 19),
      ]);
      fetchRun(runId);
    });

    pollingTimerRef.current = setInterval(() => {
      if (!socket.connected) {
        fetchRun(runId);
      }
    }, 3000);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [runId, fetchRun]);

  return {
    runData,
    isConnected,
    liveProgress,
    liveEvents,
    loading,
    error,
    refetch: () => fetchRun(runId),
  };
}

export default useRunSocket;
