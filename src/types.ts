export interface EVTObject {
  eid: string;
  slug?: string;
  title: string;
  organizer: string;
  roomUrl: string;
  scheduledTime: string;
  lifecycle: 'scheduled' | 'live' | 'delayed' | 'cancelled';
  recurrence: string;
  origin: string;
  version: number;
}

export type FrameType = 'snapshot.sync' | 'delta.sync';

export interface ETPFrame {
  type: FrameType;
  data: Partial<EVTObject>;
  version: number;
  authoritative: boolean;
  timestamp: string;
}
