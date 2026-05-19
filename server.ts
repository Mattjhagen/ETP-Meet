import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ulid } from "ulid";
import { createServer } from "http";
import { Server } from "socket.io";

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
const meetingHistory = new Map<string, ETPFrame[]>();
const slugToEid = new Map<string, string>();
const subscribers = new Map<string, Set<express.Response>>();
const roomParticipants = new Map<string, Set<string>>(); // eid -> set of socket ids

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
  meetingHistory.set(eid, []);
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
  // Also push to history
  if (frame.type === 'delta.sync') {
    const history = meetingHistory.get(eid) || [];
    history.push(frame);
    if (history.length > 100) history.shift(); // Keep last 100 deltas
    meetingHistory.set(eid, history);
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
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const PORT = 3000;

  app.use(express.json());

  // --- Socket.io Signaling & Presence ---
  io.on("connection", (socket) => {
    socket.on("join-room", (eid) => {
      if (!meetings.has(eid)) return;
      socket.join(eid);
      
      if (!roomParticipants.has(eid)) roomParticipants.set(eid, new Set());
      roomParticipants.get(eid)!.add(socket.id);
      
      const meeting = meetings.get(eid)!;
      meeting.participantCount = roomParticipants.get(eid)!.size;
      meeting.version += 1;
      
      const frame: ETPFrame = {
        type: 'delta.sync',
        data: { participantCount: meeting.participantCount },
        version: meeting.version,
        authoritative: true,
        timestamp: new Date().toISOString()
      };
      broadcast(eid, frame);
    });

    socket.on("disconnect", () => {
      roomParticipants.forEach((participants, eid) => {
        if (participants.has(socket.id)) {
          participants.delete(socket.id);
          const meeting = meetings.get(eid);
          if (meeting) {
            meeting.participantCount = participants.size;
            meeting.version += 1;
            const frame: ETPFrame = {
              type: 'delta.sync',
              data: { participantCount: meeting.participantCount },
              version: meeting.version,
              authoritative: true,
              timestamp: new Date().toISOString()
            };
            broadcast(eid, frame);
          }
        }
      });
    });
  });

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

    // Replay history if requested
    const lastVersion = parseInt(req.query.version as string) || 0;
    const history = meetingHistory.get(eid) || [];
    
    // Initial snapshot
    const snapshotFrame: ETPFrame = {
      type: 'snapshot.sync',
      data: meeting,
      version: meeting.version,
      authoritative: true,
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(snapshotFrame)}\n\n`);

    // If version is provided, replay deltas after that version
    if (lastVersion > 0) {
      history.filter(f => f.version > lastVersion).forEach(f => {
        res.write(`data: ${JSON.stringify(f)}\n\n`);
      });
    }

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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[ETP-NODE-01] Identity Sync Service online: http://0.0.0.0:${PORT}`);
  });
}

startServer();
