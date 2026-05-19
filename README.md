# ETP-Meet

**Meetings change. Traditional invites don't.**

ETP-Meet is a lightweight video meeting platform built around live synchronized meeting state. It ensures that when a meeting is rescheduled, delayed, or moved, the invitation—and the link—remains stable and up-to-date for everyone involved.

## The Problem
We've all experienced the friction of modern scheduling:
* **Stale Links:** A meeting is moved to a new room, but the calendar invite still has the old link.
* **Reschedule Chaos:** A last-minute change leads to several duplicate calendar entries and "which one is the real one?" emails.
* **Recurring Invite Fatigue:** Long-running weekly syncs where the room link or timing has drifted over months.
* **Manual Updates:** Having to manually notify every participant whenever a detail changes.

Traditional calendar invites are snapshots in time. They capture a moment, but they don't evolve as the meeting does.

## The Solution: Live Invites
ETP-Meet introduces **Live Invites**. 

Instead of a static snapshot, an ETP-Meet link is a persistent identity. The URL you share today is the same URL your participants will use tomorrow, even if the meeting is delayed by an hour or moved to a different virtual bridge. 

* **Stable URLs:** `/team-sync` stays `/team-sync` forever.
* **Live Synchronization:** Changes to title, time, or status propagate to all connected participants instantly.
* **Automatic Recovery:** If a room link is rotated or updated by the host, participants are silently updated without needing a new invite.

## Features
* **Persistent Meeting Identities:** Create human-readable, stable links for your recurring or one-off meetings.
* **Real-time Synchronization:** Powered by ETP to ensure what you see is always the canonical state.
* **Recurring Meeting Support:** Handle daily, weekly, or monthly syncs without refreshing the invite.
* **Lightweight Video:** Seamless integration with standard video bridges.
* **Private Meetings:** Simple, secure access with PIN-based authorization.
* **ICS Compatibility:** Export to standard calendars with a bridge back to the live state.
* **Developer Inspector:** Optional "Dev Mode" for those who want to see the synchronization health underneath.

## How it Works
ETP-Meet is built on the **Event Transport Protocol (ETP)**. ETP acts as the synchronization layer that keeps every participant's view of the meeting consistent.

```txt
Participant
    ↓
ETP-Meet Interface
    ↓
ETP Synchronization Layer
    ↓
Live Meeting State (Canonical)
```

The complexity of state recovery, delta history, and transport health is handled internally, allowing users to focus on the meeting itself.

## Getting Started

### Local Development
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.

### Environment Variables
Create a `.env` file based on `.env.example`:
```env
PORT=3000
NODE_ENV=development
```

## Deployment
ETP-Meet is designed to be easily deployed to modern cloud platforms:
* **Railway:** One-click deployment for full-stack Node.js applications.
* **Vercel/Netlify:** Compatible with standard frontend build pipelines.
* **Docker:** Standard containerized execution for any cloud provider.

---

*ETP-Meet is a thoughtful approach to coordination. It’s not just a video chat; it’s a living space for synchronized collaboration.*
