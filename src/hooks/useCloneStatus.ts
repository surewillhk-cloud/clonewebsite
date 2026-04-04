'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface CloneStatusData {
  taskId: string;
  status: string;
  progress: number;
  currentStep: string;
  qualityScore: number | null;
  downloadUrl: string | null;
  retryCount: number;
}

export interface CloneEvent {
  type: 'connected' | 'progress' | 'scraping' | 'analyzing' | 'generating' | 'testing' | 'fixing' | 'uploading' | 'done' | 'error' | 'stream';
  taskId: string;
  progress?: number;
  currentStep?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export function useCloneStatus(taskId: string | null, pollInterval = 3000) {
  const [data, setData] = useState<CloneStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await fetch(`/api/clone/${taskId}/status`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const json = await res.json();
      setData(json);
      setError(null);
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [taskId]);

  const connectSSE = useCallback(() => {
    if (!taskId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/clone/${taskId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const eventData: CloneEvent = JSON.parse(event.data);

        if (eventData.type === 'connected') {
          setIsConnected(true);
          fetchStatus();
          return;
        }

        if (eventData.type === 'error') {
          setData((prev) => prev ? {
            ...prev,
            status: 'failed',
            currentStep: eventData.currentStep || 'Error',
          } : null);
          return;
        }

        if (eventData.type === 'done') {
          eventSource.close();
          fetchStatus();
          return;
        }

        if (eventData.progress !== undefined) {
          setData((prev) => prev ? {
            ...prev,
            progress: eventData.progress ?? prev.progress,
            currentStep: eventData.currentStep || prev.currentStep,
            status: mapEventTypeToStatus(eventData.type),
          } : {
            taskId: taskId,
            status: mapEventTypeToStatus(eventData.type),
            progress: eventData.progress ?? 0,
            currentStep: eventData.currentStep || '',
            qualityScore: null,
            downloadUrl: null,
            retryCount: 0,
          });
        }
      } catch (err) {
        console.error('[useCloneStatus] Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      if (data?.status !== 'done' && data?.status !== 'failed') {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
            fetchStatus().then((json) => {
              if (json?.status !== 'done' && json?.status !== 'failed') {
                connectSSE();
              }
            });
          }
        }, pollInterval);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [taskId, fetchStatus, pollInterval, data?.status]);

  useEffect(() => {
    if (!taskId) return;

    const cleanup = connectSSE();

    return () => {
      cleanup?.();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [taskId, connectSSE]);

  return { data, error, isConnected, refetch: fetchStatus };
}

function mapEventTypeToStatus(type: string): string {
  switch (type) {
    case 'scraping': return 'scraping';
    case 'analyzing': return 'analyzing';
    case 'generating': return 'generating';
    case 'testing': return 'testing';
    case 'fixing': return 'testing';
    case 'uploading': return 'uploading';
    case 'done': return 'done';
    case 'error': return 'failed';
    default: return 'processing';
  }
}
