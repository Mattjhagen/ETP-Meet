export interface EVTObject {
  eid: string;
  slug?: string;
  title: string;
  description?: string;
  organizer: string;
  roomUrl: string;
  roomName: string;
  scheduledTime: string;
  duration: number;
  timezone: string;
  lifecycle: 'scheduled' | 'live' | 'delayed' | 'cancelled';
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  privacy: 'public' | 'private';
  pin?: string;
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
