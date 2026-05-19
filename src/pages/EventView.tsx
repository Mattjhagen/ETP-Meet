import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  ArrowLeft, 
  Link as LinkIcon, 
  Clock, 
  ShieldCheck, 
  RefreshCcw,
  AlertTriangle,
  XCircle,
  Play,
  Monitor,
  Video,
  Mic,
  MessageSquare,
  Settings,
  Download,
  Activity,
  Heart,
  Globe,
  Users,
  ChevronRight,
  Shield,
  Radio,
  ShieldAlert
} from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useETP } from '../hooks/useETP';
import io from 'socket.io-client';

export default function EventView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [eid, setEid] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const jitsiApiRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  // Resolve slug to EID
  useEffect(() => {
    if (!slug) return;
    
    if (slug.startsWith('evt_')) {
      setEid(slug);
      setResolving(false);
      return;
    }

    fetch(`/api/e/resolve/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error("NotFound");
        return res.json();
      })
      .then(data => {
        setEid(data.eid);
        setResolving(false);
      })
      .catch(() => {
        setResolving(false);
      });
  }, [slug]);

  const { eventState, syncStatus, lastUpdate, mutate } = useETP(eid);
  const [showSyncToast, setShowSyncToast] = useState(false);
  const [devMode, setDevMode] = useState(false);

  // Auth Presence Signaling
  useEffect(() => {
    if (isJoined && eid) {
      socketRef.current = io();
      socketRef.current.emit('join-room', eid);

      return () => {
        socketRef.current?.disconnect();
        socketRef.current = null;
      };
    }
  }, [isJoined, eid]);

  useEffect(() => {
    if (lastUpdate) {
      setShowSyncToast(true);
      const t = setTimeout(() => setShowSyncToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [lastUpdate, eventState?.version]);

  if (resolving) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-100 min-h-screen bg-slate-950 gap-6">
        <div className="relative">
          <Activity className="w-16 h-16 text-indigo-500 animate-pulse relative z-10" />
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl animate-pulse" />
        </div>
        <div className="text-slate-600 font-mono text-[9px] tracking-[0.4em] uppercase font-black">Connecting...</div>
      </div>
    );
  }

  if (!eventState && !resolving && eid) {
      return (
          <div className="flex flex-col items-center justify-center min-vh-100 min-h-screen bg-slate-950 gap-6">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              </div>
              <div className="text-center space-y-2 px-6">
                <div className="text-white font-black text-2xl tracking-tight">Room Suspended</div>
                <div className="text-slate-500 font-medium max-w-xs mx-auto">This meeting space is no longer available or has moved to a different node.</div>
              </div>
              <button 
                onClick={() => navigate('/')} 
                className="bg-white text-slate-950 px-10 py-4 rounded-2xl font-bold uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all active:scale-95"
              >
                Return to Dashboard
              </button>
          </div>
      )
  }

  if (!eventState) return null;

  const roomName = eventState.roomUrl.split('/').pop() || 'cmameet-room';

  const handleUpdateUrl = () => {
    const newSlug = Math.random().toString(36).substring(7);
    const newUrl = `https://meet.jit.si/cmameet-live-${newSlug}`;
    mutate({ roomUrl: newUrl });
  };

  const handleStatusChange = (status: 'scheduled' | 'live' | 'delayed' | 'cancelled') => {
    mutate({ lifecycle: status });
  };

  const handleExportICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CMAMeet//ETP Reference//EN
BEGIN:VEVENT
UID:${eventState.eid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${eventState.scheduledTime.replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${eventState.title}
DESCRIPTION:${eventState.description || 'Live ETP Meeting'}
LOCATION:${eventState.roomUrl}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${eventState.title || 'meeting'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApiReady = (apiObj: any) => {
    jitsiApiRef.current = apiObj;
    apiObj.on('readyToClose', () => {
      setIsJoined(false);
    });
  };

  const handleJitsiIFrameRef1 = (iframeRef: HTMLDivElement) => {
    if (iframeRef) {
      iframeRef.style.height = '100%';
      iframeRef.style.width = '100%';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      {/* Floating Sync Notification */}
      <AnimatePresence>
        {showSyncToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%' }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-white text-slate-950 px-8 py-4 rounded-[2rem] font-black text-[10px] tracking-widest uppercase shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 border border-white/10"
          >
            <Activity className="w-4 h-4 animate-pulse text-indigo-500" />
            <span>Room updated</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Status Bar */}
      <div className="px-8 py-4 flex items-center justify-between shrink-0 border-b border-white/5 bg-slate-950/50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
              syncStatus === 'stale' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
            }`} />
            <span className="text-[10px] font-black tracking-widest uppercase opacity-40">
              {syncStatus}
            </span>
          </div>
        </div>
        <button 
          onClick={() => setDevMode(!devMode)}
          className={`flex items-center gap-2 text-[9px] font-black tracking-widest uppercase transition-all px-3 py-1.5 rounded-full border ${
            devMode ? 'bg-white text-slate-950 border-white' : 'text-slate-600 border-white/10 hover:border-white/20'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Dev Mode</span>
        </button>
      </div>

      {/* Developer Inspector Panel */}
      <AnimatePresence>
        {devMode && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-900 border-b border-white/10 overflow-hidden"
          >
            <div className="px-8 py-6 grid md:grid-cols-4 gap-8 font-mono text-[9px] tracking-widest uppercase">
              <div className="space-y-4">
                <div className="text-slate-600 border-b border-white/5 pb-2">Identity Cluster</div>
                <div className="text-slate-300">{eventState.origin}</div>
                <div className="text-slate-300 truncate">{eventState.eid}</div>
              </div>
              <div className="space-y-4">
                <div className="text-slate-600 border-b border-white/5 pb-2">Sync Sequence</div>
                <div className="text-indigo-400 font-black">v{eventState.version}.authorized</div>
                <div className="text-slate-500">Last Delta: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'N/A'}</div>
              </div>
              <div className="space-y-4">
                <div className="text-slate-600 border-b border-white/5 pb-2">Transport</div>
                <div className="text-emerald-400">SSE Recovery Active</div>
                <div className="text-slate-500">Bridge: {eventState.bridgeStatus}</div>
              </div>
              <div className="space-y-4">
                <div className="text-slate-600 border-b border-white/5 pb-2">State Recovery</div>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-white/5 border border-white/10 px-4 py-2 rounded hover:bg-white/10 transition-all block w-full text-left"
                >
                  Force Resync
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!isJoined ? (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, scale: 1.01, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(20px)' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 container mx-auto px-6 py-12 md:py-20 flex flex-col"
            >
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-3 text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest mb-16 transition-all group w-fit"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Node Root</span>
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                <div className="lg:col-span-8 space-y-16">
                  <header className="space-y-10">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        key={eventState.lifecycle}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-[10px] font-black px-4 py-1.5 rounded-full tracking-[0.2em] uppercase border ${
                          eventState.lifecycle === 'live' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-slate-500/10 border-white/10 text-slate-400'
                        }`}
                      >
                        {eventState.lifecycle}
                      </motion.div>
                    </div>
                    
                    <div className="space-y-6">
                      <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-[0.8] mb-4">
                        {eventState.title}
                      </h1>
                      <div className="flex flex-col gap-4">
                        <p className="text-2xl md:text-3xl text-slate-400 font-medium tracking-tight">
                          Hosted by <span className="text-white font-bold">{eventState.organizer}</span>
                        </p>
                        <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl leading-relaxed">
                          {eventState.description}
                        </p>
                      </div>
                    </div>
                  </header>

                  <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] p-12 md:p-16 shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 grid md:grid-cols-2 gap-16">
                      <div className="space-y-12">
                        <div className="flex items-start gap-6">
                          <div className="w-16 h-16 rounded-3xl bg-indigo-500/5 flex items-center justify-center shrink-0 border border-white/5 text-indigo-400 transition-colors group-hover:border-indigo-500/20 shadow-2xl">
                            <Clock className="w-8 h-8" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Schedule</div>
                            <div className="text-3xl font-black text-white tracking-tight tabular-nums">
                              {new Date(eventState.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{new Date(eventState.scheduledTime).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-6">
                          <div className="w-16 h-16 rounded-3xl bg-emerald-500/5 flex items-center justify-center shrink-0 border border-white/5 text-emerald-400 transition-colors group-hover:border-emerald-500/20 shadow-2xl">
                            <Users className="w-8 h-8" />
                          </div>
                          <div className="space-y-2">
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Availability</div>
                            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                              <span className="text-sm font-black text-white uppercase tracking-widest">{eventState.participantCount} Present</span>
                              <div className="flex gap-1">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className="w-1.5 h-3 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-end space-y-6">
                        <button 
                          onClick={() => setIsJoined(true)}
                          disabled={eventState.lifecycle === 'cancelled'}
                          className="w-full bg-white text-slate-950 font-black py-8 rounded-[2.5rem] flex items-center justify-center gap-4 hover:bg-white hover:scale-[1.02] active:scale-95 transition-all shadow-[0_30px_60px_-12px_rgba(255,255,255,0.1)] disabled:opacity-20 disabled:grayscale group"
                        >
                          <Monitor className="w-7 h-7" />
                          <span className="text-2xl tracking-tighter uppercase font-black">Enter Room</span>
                        </button>
                        <div className="flex items-center justify-center">
                          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                            <Activity className="w-3.5 h-3.5" />
                            <span>Live Synchronized</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-10">
                  <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                     <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-10 border-b border-white/5 pb-6">Room Control</h3>
                     <div className="space-y-4">
                       <button 
                         onClick={handleUpdateUrl}
                         className="w-full bg-white/5 hover:bg-white/10 hover:border-white/20 text-white font-bold py-5 px-8 rounded-3xl flex items-center justify-between border border-white/5 transition-all active:scale-[0.98]"
                       >
                         <span className="text-sm font-black uppercase tracking-widest">Update Link</span>
                         <RefreshCcw className="w-4 h-4 opacity-40 group-hover:rotate-180 transition-transform duration-500" />
                       </button>
                       <button 
                         onClick={() => handleStatusChange('live')}
                         className="w-full bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-bold py-5 px-8 rounded-3xl flex items-center justify-between border border-emerald-500/10 transition-all active:scale-[0.98]"
                       >
                         <span className="text-sm font-black uppercase tracking-widest">Start Now</span>
                         <Zap className="w-4 h-4 fill-current" />
                       </button>
                       <button 
                         onClick={() => handleStatusChange('delayed')}
                         className="w-full bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 font-bold py-5 px-8 rounded-3xl flex items-center justify-between border border-amber-500/10 transition-all active:scale-[0.98]"
                       >
                         <span className="text-sm font-black uppercase tracking-widest">Signal Delay</span>
                         <AlertTriangle className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => handleStatusChange('cancelled')}
                         className="w-full bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 font-bold py-5 px-8 rounded-3xl flex items-center justify-between border border-rose-500/10 transition-all active:scale-[0.98]"
                       >
                         <span className="text-sm font-black uppercase tracking-widest">End Meeting</span>
                         <XCircle className="w-4 h-4" />
                       </button>
                     </div>
                  </div>

                  <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 space-y-8 shadow-2xl">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-6">Integrations</h4>
                    <button 
                      onClick={handleExportICS}
                      className="flex items-center justify-between text-slate-400 hover:text-white font-black transition-all group w-full"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/5 transition-all">
                          <Download className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-xs uppercase tracking-widest">Add to Calendar</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="call"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex-1 flex flex-col bg-slate-950"
            >
              {/* Floating Media Header */}
              <div className="absolute top-8 left-8 right-8 z-50 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                  <button 
                    onClick={() => setIsJoined(false)}
                    className="bg-black/60 backdrop-blur-3xl p-5 rounded-[2rem] border border-white/10 text-white hover:bg-slate-900 transition-all shadow-2xl active:scale-95"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="bg-black/60 backdrop-blur-3xl px-8 py-4 rounded-[2.5rem] border border-white/10 flex items-center gap-6 shadow-2xl">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase mb-1">Live Space</span>
                      <span className="text-lg font-black text-white tracking-tight uppercase leading-none">{eventState.title}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-4 pointer-events-auto">
                  <div className="bg-black/60 backdrop-blur-3xl px-6 py-4 rounded-full border border-white/10 flex items-center gap-6 shadow-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>{eventState.participantCount} Present</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2.5 text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Synchronized</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <JitsiMeeting
                  domain="meet.jit.si"
                  roomName={roomName}
                  configOverwrite={{
                    startWithAudioMuted: true,
                    disableModeratorIndicator: true,
                    startScreenSharing: false,
                    enableEmailInStats: false,
                    prejoinPageEnabled: false,
                    toolbarButtons: ['microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen', 'fodeviceselection', 'hangup', 'chat', 'settings', 'raisehand', 'videoquality', 'filmstrip', 'tileview', 'videobackgroundblur'],
                  }}
                  interfaceConfigOverwrite={{
                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                    SHOW_JITSI_WATERMARK: false,
                    HIDE_DEEP_LINKING_LOGO: true,
                  }}
                  userInfo={{
                    displayName: 'Guest Participant',
                    email: `guest-${Math.floor(Math.random()*1000)}@cmameet.etp`
                  }}
                  onApiReady={handleApiReady}
                  getIFrameRef={handleJitsiIFrameRef1}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
