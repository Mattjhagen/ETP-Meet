import { useState, useEffect, useCallback } from 'react';
import { EVTObject, ETPFrame } from '../types';

export function useETP(eid: string | null) {
  const [eventState, setEventState] = useState<EVTObject | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'synced' | 'disconnected'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (!eid) return;

    setSyncStatus('connecting');
    const eventSource = new EventSource(`/api/e/${eid}/stream`);

    eventSource.onmessage = (event) => {
      const frame: ETPFrame = JSON.parse(event.data);
      
      if (frame.type === 'snapshot.sync') {
        setEventState(frame.data as EVTObject);
        setSyncStatus('synced');
      } else if (frame.type === 'delta.sync') {
        setEventState(prev => prev ? { ...prev, ...frame.data, version: frame.version } : null);
        setLastUpdate(frame.timestamp);
      }
    };

    eventSource.onerror = () => {
      setSyncStatus('disconnected');
      // Attempt reconnection after 5s or just wait for EventSource auto-retry
    };

    return () => {
      eventSource.close();
    };
  }, [eid]);

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
