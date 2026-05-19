import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Users, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Globe, 
  Shield, 
  Activity,
  X
} from 'lucide-react';
import { EVTObject } from '../types';

export default function Dashboard() {
  const [meetings, setMeetings] = useState<EVTObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/meetings')
      .then(res => res.json())
      .then(data => {
        setMeetings(data);
        setLoading(false);
      });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, organizer, slug: slug || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/join/${data.slug || data.eid}`);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-4 tracking-[0.2em] text-[10px] uppercase">
              <Zap className="w-4 h-4 fill-current" />
              <span>Reference Node • Authoritative</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
              CMAMeet<span className="text-indigo-500">.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl font-medium leading-relaxed">
              Meetings as live synchronized event identities. Lightweight, open-source, and natively ETP-compliant.
            </p>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="group flex items-center gap-3 bg-white text-slate-950 px-8 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            Create Event
          </button>
        </header>

        <section>
          <div className="flex items-center gap-3 mb-8 px-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Event Identities</h2>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white/5 rounded-[1.5rem] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {meetings.map((meeting) => (
                <motion.div
                  key={meeting.eid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/5 p-8 rounded-[2rem] hover:bg-white/[0.08] transition-colors group relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[9px] font-mono font-bold bg-white/10 text-slate-400 px-2 py-1 rounded tracking-widest uppercase">
                          {meeting.eid}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-1 rounded tracking-widest uppercase ${
                          meeting.lifecycle === 'live' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 bg-white/5'
                        }`}>
                          {meeting.lifecycle}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold mb-3 truncate group-hover:text-indigo-400 transition-colors">
                        {meeting.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-500">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{meeting.organizer}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(meeting.scheduledTime).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <span>v{meeting.version}</span>
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/join/${meeting.slug || meeting.eid}`}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 shrink-0"
                    >
                      Enter Call
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 opacity-40 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-8 text-[10px] font-mono tracking-widest uppercase">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span>Node: CMAMeet-01</span>
            </div>
            <span>Transport: ETP/SSE</span>
            <span>Uptime: 99.98%</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Total Syncs: {meetings.reduce((acc, m) => acc + m.version, 0)}
            </span>
          </div>
        </footer>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
            >
              <button 
                onClick={() => setShowCreate(false)}
                className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-3xl font-black mb-2">Create New Event</h2>
              <p className="text-slate-400 mb-8 font-medium">Broadcast a live event identity to the ETP cluster.</p>
              
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Event Title</label>
                  <input 
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="E.g. Friday Open Recovery"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-indigo-500 font-bold transition-colors"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Organizer</label>
                    <input 
                      required
                      value={organizer}
                      onChange={e => setOrganizer(e.target.value)}
                      placeholder="Name or group"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-indigo-500 font-bold transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">URL Slug (Optional)</label>
                    <input 
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                      placeholder="custom-slug"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-indigo-500 font-bold transition-colors"
                    />
                  </div>
                </div>
                <button 
                  disabled={creating}
                  className="w-full bg-white text-slate-950 font-black py-5 rounded-[1.5rem] mt-4 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                  {creating ? 'Initializing Identity...' : 'Generate Live EID'}
                  <Zap className="w-5 h-5 fill-current" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
