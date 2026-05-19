export interface EVTObject {
  eid: string;
  slug?: string;
  title: string;
  description?: string;
  organizer: string;
  roomUrl: string;
  scheduledTime: string;
  lifecycle: 'scheduled' | 'live' | 'delayed' | 'cancelled';
  recurrence: string;
  origin: string;
  version: number;
  participantCount: number;
  bridgeStatus: 'optimal' | 'degraded' | 're-routing';
}

export type FrameType = 'snapshot.sync' | 'delta.sync' | 'heartbeat.sync';

export interface ETPFrame {
  type: FrameType;
  data: Partial<EVTObject> | null;
  version: number;
  authoritative: boolean;
  timestamp: string;
}
