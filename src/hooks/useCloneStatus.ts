'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CloneStatusData {
  taskId: string;
  status: string;
  progress: number;
  currentStep: string;
  qualityScore: number | null;
  downloadUrl: string | null;
  retryCount: number;
}

export function useCloneStatus(taskId: string | null, pollInterval = 3000) {
  const [data, setData] = useState<CloneStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      const json = await fetchStatus();
      if (cancelled || json?.status === 'done' || json?.status === 'failed') return false;
      return true;
    };

    poll().then((shouldContinue) => {
      if (cancelled || !shouldContinue) return;
      intervalId = setInterval(async () => {
        const shouldKeepPolling = await poll();
        if (!shouldKeepPolling && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, pollInterval);
    });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [taskId, pollInterval, fetchStatus]);

  return { data, error, refetch: fetchStatus };
}
