import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ulid } from "ulid";

// --- Types ---

interface EVTObject {
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

type FrameType = 'snapshot.sync' | 'delta.sync';

interface ETPFrame {
  type: FrameType;
  data: Partial<EVTObject>;
  version: number;
  authoritative: boolean;
  timestamp: string;
}

// --- Store ---

const meetings = new Map<string, EVTObject>();
const slugToEid = new Map<string, string>();
const subscribers = new Map<string, Set<express.Response>>();

// Helper to create a meeting
function createMeeting(title: string, organizer: string, slug: string): EVTObject {
  const eid = `evt_${ulid().toLowerCase()}`;
  const meeting: EVTObject = {
    eid,
    slug,
    title,
    organizer,
    roomUrl: `https://meet.jit.si/cmameet-${slug}-${ulid().toLowerCase().slice(0, 8)}`,
    scheduledTime: new Date(Date.now() + 3600000).toISOString(),
    lifecycle: 'scheduled',
    recurrence: 'weekly',
    origin: 'cmameet-authoritative',
    version: 1
  };
  meetings.set(eid, meeting);
  slugToEid.set(slug, eid);
  return meeting;
}

// Initial Data
createMeeting("Team Daily Sync", "Alice", "team-sync");
createMeeting("Crystal Meth Anonymous - Friday Night", "CMA Group", "friday-night");
createMeeting("Design Workshop", "Bob", "design-workshop");

// --- SSE Broadcast ---

function broadcast(eid: string, frame: ETPFrame) {
  const clients = subscribers.get(eid);
  if (clients) {
    const message = `data: ${JSON.stringify(frame)}\n\n`;
    clients.forEach(res => res.write(message));
  }
}

// --- App ---

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Resolver: Slug to EID
  app.get("/api/e/resolve/:slug", (req, res) => {
    const eid = slugToEid.get(req.params.slug);
    if (!eid) return res.status(404).json({ error: "Event not found" });
    res.json({ eid });
  });

  // Get Event Snapshot
  app.get("/api/e/:eid", (req, res) => {
    const meeting = meetings.get(req.params.eid);
    if (!meeting) return res.status(404).json({ error: "Event not found" });
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
    if (!meeting) return res.status(404).json({ error: "Event not found" });

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
    if (!meeting) return res.status(404).json({ error: "Event not found" });

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
      subscribers.get(eid)?.delete(res);
      if (subscribers.get(eid)?.size === 0) subscribers.delete(eid);
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
