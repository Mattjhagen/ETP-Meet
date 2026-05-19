import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Users, Activity, ChevronRight, Zap } from 'lucide-react';
import { EVTObject } from '../types';

export default function Dashboard() {
  const [meetings, setMeetings] = useState<EVTObject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/meetings')
      .then(res => res.json())
      .then(data => {
        setMeetings(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <header className="mb-12">
        <div className="flex items-center gap-2 text-indigo-600 font-bold mb-2 tracking-tight">
          <Zap className="w-5 h-5 fill-current" />
          <span>ETP CANONICAL</span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
          CMAMeet Live Event State
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl font-medium">
          Authoritative real-time synchronization of meeting identities. 
          Meetings are native ETP event-state, propagating mutations instantly to all nodes.
        </p>
      </header>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6">
          {meetings.map((meeting) => (
            <motion.div
              key={meeting.eid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded tracking-widest uppercase">
                      ID: {meeting.eid}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase ${
                      meeting.lifecycle === 'live' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : meeting.lifecycle === 'cancelled' 
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {meeting.lifecycle}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{meeting.title}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{meeting.organizer}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(meeting.scheduledTime).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4" />
                      <span>Version: {meeting.version}</span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/e/${meeting.slug || meeting.eid}`}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                >
                  Enter Event
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <footer className="mt-20 border-t border-slate-200 pt-8 flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-400 text-sm font-medium">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Origin Authority: {meetings[0]?.origin || 'cmameet-node-01'}</span>
          </div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-slate-300" />
          <span>Synchronized via ETP/SSE</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          <Activity className="w-3.5 h-3.5 text-indigo-500" />
          <span>Total Delta Cycles: {meetings.reduce((acc, m) => acc + m.version, 0)}</span>
        </div>
      </footer>
    </div>
  );
}
