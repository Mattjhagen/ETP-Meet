import { useState, useEffect, useCallback, useRef } from 'react';
import { EVTObject, ETPFrame } from '../types';

export function useETP(eid: string | null) {
  const [eventState, setEventState] = useState<EVTObject | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'synced' | 'disconnected' | 'stale'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);

  const resetStaleTimer = useCallback(() => {
    if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current);
    heartbeatTimer.current = setTimeout(() => {
      setSyncStatus('stale');
    }, 45000); // Stale after 45s of silence
  }, []);

  useEffect(() => {
    if (!eid) return;

    setSyncStatus('connecting');
    const eventSource = new EventSource(`/api/e/${eid}/stream`);

    eventSource.onmessage = (event) => {
      const frame: ETPFrame = JSON.parse(event.data);
      
      if (frame.type === 'snapshot.sync') {
        setEventState(frame.data as EVTObject);
        setSyncStatus('synced');
        resetStaleTimer();
      } else if (frame.type === 'delta.sync') {
        setEventState(prev => prev ? { ...prev, ...frame.data, version: frame.version } : null);
        setLastUpdate(frame.timestamp);
        setSyncStatus('synced');
        resetStaleTimer();
      } else if (frame.type === 'heartbeat.sync') {
        setSyncStatus('synced');
        resetStaleTimer();
      }
    };

    eventSource.onerror = () => {
      setSyncStatus('disconnected');
    };

    return () => {
      eventSource.close();
      if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current);
    };
  }, [eid, resetStaleTimer]);

  const mutate = useCallback(async (updates: Partial<EVTObject>) => {
    if (!eid) return;
    try {
      const res = await fetch(`/api/e/${eid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return await res.json();
    } catch (err) {
      console.error("Mutation failed", err);
    }
  }, [eid]);

  return { eventState, syncStatus, lastUpdate, mutate };
}
