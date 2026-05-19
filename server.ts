import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ulid } from "ulid";

// --- Types ---

interface EVTObject {
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

type FrameType = 'snapshot.sync' | 'delta.sync' | 'heartbeat.sync';

interface ETPFrame {
  type: FrameType;
  data: Partial<EVTObject> | null;
  version: number;
  authoritative: boolean;
  timestamp: string;
}

// --- Store ---

const meetings = new Map<string, EVTObject>();
const slugToEid = new Map<string, string>();
const subscribers = new Map<string, Set<express.Response>>();

// Helper to create a meeting
function createMeeting(title: string, organizer: string, slug: string, description?: string): EVTObject {
  const eid = `evt_${ulid().toLowerCase()}`;
  const meeting: EVTObject = {
    eid,
    slug,
    title,
    description: description || "Canonical meeting event state synchronized via ETP.",
    organizer,
    roomUrl: `https://meet.jit.si/cmameet-${slug || ulid().toLowerCase().slice(0, 8)}`,
    scheduledTime: new Date(Date.now() + 3600000).toISOString(),
    lifecycle: 'scheduled',
    recurrence: 'once',
    origin: 'cmameet-authoritative-node-01',
    version: 1,
    participantCount: 0,
    bridgeStatus: 'optimal'
  };
  meetings.set(eid, meeting);
  if (slug) slugToEid.set(slug, eid);
  return meeting;
}

// Initial Data
createMeeting("Community Check-in", "CMA Network", "community-call");
createMeeting("Authoritative ETP Workshop", "Protocol Foundation", "etp-workshop");

// --- SSE Broadcast ---

function broadcast(eid: string, frame: ETPFrame) {
  const clients = subscribers.get(eid);
  if (clients) {
    const message = `data: ${JSON.stringify(frame)}\n\n`;
    clients.forEach(res => res.write(message));
  }
}

// Heartbeat Loop
setInterval(() => {
  meetings.forEach((meeting, eid) => {
    const frame: ETPFrame = {
      type: 'heartbeat.sync',
      data: null,
      version: meeting.version,
      authoritative: true,
      timestamp: new Date().toISOString()
    };
    broadcast(eid, frame);
  });
}, 15000);

// --- App ---

async function startServer() {
  const app = express();
  // Port 3000 is hardcoded for infrastructure compatibility.
  // Railway and other container platforms will detect the exposed port or use this fallback.
  const PORT = 3000;

  app.use(express.json());

  // Resolver: Slug to EID
  app.get("/api/e/resolve/:slug", (req, res) => {
    const eid = slugToEid.get(req.params.slug);
    if (!eid) return res.status(404).json({ error: "Event identity not found" });
    res.json({ eid });
  });

  // Create Meeting
  app.post("/api/meetings", (req, res) => {
    const { title, organizer, slug, description } = req.body;
    if (!title || !organizer) return res.status(400).json({ error: "Missing identity params" });
    
    if (slug && slugToEid.has(slug)) {
      return res.status(400).json({ error: "Slug collision detected" });
    }

    const meeting = createMeeting(title, organizer, slug, description);
    res.status(201).json(meeting);
  });

  // Get Event Snapshot
  app.get("/api/e/:eid", (req, res) => {
    const meeting = meetings.get(req.params.eid);
    if (!meeting) return res.status(404).json({ error: "Identity sequence missing" });
    res.json(meeting);
  });

  // List all meetings
  app.get("/api/meetings", (req, res) => {
    res.json(Array.from(meetings.values()));
  });

  // Update Event (Mutations)
  app.patch("/api/e/:eid", (req, res) => {
    const { eid } = req.params;
    const meeting = meetings.get(eid);
    if (!meeting) return res.status(404).json({ error: "Identity sequence missing" });

    const updates = req.body;
    meeting.version += 1;
    Object.assign(meeting, updates);

    const frame: ETPFrame = {
      type: 'delta.sync',
      data: updates,
      version: meeting.version,
      authoritative: true,
      timestamp: new Date().toISOString()
    };

    broadcast(eid, frame);
    res.json(meeting);
  });

  // SSE Stream
  app.get("/api/e/:eid/stream", (req, res) => {
    const { eid } = req.params;
    const meeting = meetings.get(eid);
    if (!meeting) return res.status(404).json({ error: "Identity sequence missing" });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Initial snapshot
    const snapshotFrame: ETPFrame = {
      type: 'snapshot.sync',
      data: meeting,
      version: meeting.version,
      authoritative: true,
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(snapshotFrame)}\n\n`);

    if (!subscribers.has(eid)) subscribers.set(eid, new Set());
    subscribers.get(eid)!.add(res);

    req.on('close', () => {
      subscribers.get(eid)!.delete(res);
      if (subscribers.get(eid)!.size === 0) subscribers.delete(eid);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ETP-NODE-01] Identity Sync Service online: http://0.0.0.0:${PORT}`);
  });
}

startServer();
