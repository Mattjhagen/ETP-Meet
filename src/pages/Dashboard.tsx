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
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 font-sans">
      {/* Background Layer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-32">
        <header className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 text-indigo-400 font-bold tracking-[0.25em] text-[10px] uppercase">
              <Activity className="w-4 h-4" />
              <span>Live Meeting Environment</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter">
              Meet<span className="text-indigo-500">.</span>
            </h1>
            <p className="text-slate-400 text-xl max-w-lg font-medium leading-relaxed">
              Simple, synchronized meeting spaces. No friction, just live collaboration.
            </p>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="group flex items-center gap-3 bg-white text-slate-950 px-10 py-5 rounded-2xl font-bold hover:shadow-[0_0_50px_rgba(255,255,255,0.15)] transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span className="tracking-tight uppercase">New Meeting</span>
          </button>
        </header>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2 mb-10">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-indigo-500" />
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Active Rooms</h2>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-white/5 rounded-[2rem] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {meetings.map((meeting) => (
                <motion.div
                  key={meeting.eid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/40 backdrop-blur-sm border border-white/5 p-8 rounded-[2.5rem] hover:bg-slate-900/60 transition-all group relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`text-[9px] font-bold px-3 py-1 rounded-full tracking-widest uppercase ${
                          meeting.lifecycle === 'live' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 bg-white/5'
                        }`}>
                          {meeting.lifecycle}
                        </span>
                      </div>
                      <h3 className="text-3xl font-bold mb-4 truncate tracking-tight group-hover:text-indigo-400 transition-colors">
                        {meeting.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-8 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 opacity-50" />
                          <span>{meeting.organizer}</span>
                        </div>
                        {meeting.participantCount > 0 && (
                          <div className="flex items-center gap-2 text-emerald-500">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <span>{meeting.participantCount} Active</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/join/${meeting.slug || meeting.eid}`}
                      className="bg-slate-800 hover:bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs transition-all shadow-xl active:scale-95 shrink-0 uppercase tracking-widest"
                    >
                      Enter
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-40 flex flex-col md:flex-row md:items-center justify-between gap-8 py-10 border-t border-white/5 opacity-50 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-8 text-[9px] font-mono tracking-[0.3em] uppercase text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-1.2 h-1.2 rounded-full bg-emerald-500" />
              <span>Service Online</span>
            </div>
            <span>v1.4.2</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Minimal • Reliable • Open</span>
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
