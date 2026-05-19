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
  ChevronRight
} from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useETP } from '../hooks/useETP';

export default function EventView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [eid, setEid] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const jitsiApiRef = useRef<any>(null);

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

  useEffect(() => {
    if (lastUpdate) {
      setShowSyncToast(true);
      const t = setTimeout(() => setShowSyncToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [lastUpdate, eventState?.version]);

  if (resolving) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-6">
        <div className="relative">
          <Zap className="w-16 h-16 text-indigo-500 animate-pulse relative z-10" />
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl animate-pulse" />
        </div>
        <div className="text-slate-600 font-mono text-[9px] tracking-[0.4em] uppercase font-black">Syncing Topology...</div>
      </div>
    );
  }

  if (!eventState && !resolving && eid) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-6">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-rose-500" />
              </div>
              <div className="text-center space-y-2">
                <div className="text-white font-black text-2xl tracking-tight">Sequence Corrupted</div>
                <div className="text-slate-500 font-medium">This event identity no longer exists on the ETP cluster.</div>
              </div>
              <button 
                onClick={() => navigate('/')} 
                className="bg-white text-slate-950 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Return to Node
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
    apiObj.on('videoConferenceJoined', () => {
      mutate({ participantCount: eventState.participantCount + 1, lifecycle: 'live' });
    });
    apiObj.on('readyToClose', () => {
      setIsJoined(false);
      mutate({ participantCount: Math.max(0, eventState.participantCount - 1) });
    });
  };

  const handleJitsiIFrameRef1 = (iframeRef: HTMLDivElement) => {
    if (iframeRef) {
      iframeRef.style.height = '100%';
      iframeRef.style.width = '100%';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Floating Sync Notification */}
      <AnimatePresence>
        {showSyncToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%' }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-6 py-3 rounded-full font-bold text-xs shadow-2xl flex items-center gap-3 border border-indigo-400/30 whitespace-nowrap"
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            Meeting state synchronized to v{eventState.version}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Protocol Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md px-8 py-3 flex items-center justify-between font-mono text-[9px] tracking-[0.25em] uppercase shrink-0 border-b border-white/5 whitespace-nowrap overflow-x-auto gap-12 no-scrollbar scroll-smooth">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
              syncStatus === 'stale' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
            }`} />
            <span className={syncStatus === 'synced' ? 'text-emerald-400' : 'text-slate-500'}>
              {syncStatus}
            </span>
          </div>
          <div className="text-slate-600 border-l border-white/10 pl-8">Origin • {eventState.origin}</div>
          <div className="text-slate-600 border-l border-white/10 pl-8">Identity • {eventState.eid}</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded text-indigo-400 font-bold shrink-0">v{eventState.version}.seq</div>
          {lastUpdate && <span className="text-slate-700 font-black shrink-0">Delta • {new Date(lastUpdate).toLocaleTimeString()}</span>}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!isJoined ? (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 container mx-auto px-6 py-8 md:py-16 flex flex-col"
            >
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-slate-500 hover:text-white font-bold text-sm mb-12 transition-colors group w-fit"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Return to Node
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Primary Content Card */}
                <div className="lg:col-span-8 space-y-12">
                  <header>
                    <div className="flex items-center gap-4 mb-8">
                      <span className="text-[10px] font-bold px-3 py-1 rounded bg-indigo-600 text-white tracking-[0.2em] uppercase shadow-lg shadow-indigo-500/20">
                        Live Event Identity
                      </span>
                      <motion.span 
                        key={eventState.lifecycle}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-[10px] font-bold px-3 py-1 rounded tracking-[0.2em] uppercase border ${
                          eventState.lifecycle === 'live' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : eventState.lifecycle === 'cancelled'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                        }`}
                      >
                        {eventState.lifecycle}
                      </motion.span>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.85] mb-10">
                      {eventState.title}
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-2xl leading-relaxed mb-4">
                      Hosted by <span className="text-indigo-400 font-bold">{eventState.organizer}</span>.
                    </p>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">
                      {eventState.description}
                    </p>
                  </header>

                  <div className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-10 md:p-14 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-16 opacity-[0.03] -rotate-12 transition-transform group-hover:scale-110 pointer-events-none">
                      <Globe className="w-[30rem] h-[30rem]" />
                    </div>
                    
                    <div className="relative z-10 grid md:grid-cols-2 gap-12">
                      <div className="space-y-10">
                        <div className="flex items-start gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                            <Clock className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Synchronized Schedule</div>
                            <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
                              {new Date(eventState.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-sm text-slate-500 font-medium mt-1">{new Date(eventState.scheduledTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                            <ShieldCheck className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Transport Reliability</div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl font-bold text-white capitalize">{eventState.bridgeStatus}</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div key={i} className={`w-1 h-3 rounded-full ${i <= 4 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                ))}
                              </div>
                            </div>
                            <div className="text-sm text-slate-500 font-medium">Authoritative origin confirmed</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-end space-y-4">
                        <button 
                          onClick={() => setIsJoined(true)}
                          disabled={eventState.lifecycle === 'cancelled'}
                          className="w-full bg-white text-slate-950 font-black py-7 rounded-[2rem] flex items-center justify-center gap-4 hover:bg-slate-100 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-indigo-500/10 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed disabled:scale-100 group"
                        >
                          <Play className="w-6 h-6 fill-current" />
                          <span className="text-xl tracking-tight uppercase">Enter Media Room</span>
                        </button>
                        <div className="flex items-center justify-center gap-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {eventState.participantCount} Active Users</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                          <span className="flex items-center gap-1.5 text-indigo-400"><Activity className="w-3.5 h-3.5" /> Live Syncing</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Protocol Controls */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
                     <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
                     <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                       <Settings className="w-5 h-5 text-indigo-400" />
                       Administrative
                     </h3>
                     <div className="space-y-4">
                       <button 
                         onClick={handleUpdateUrl}
                         className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-between border border-white/5 transition-all active:scale-95"
                       >
                         <span className="text-sm">Rotate Room Key</span>
                         <RefreshCcw className="w-4 h-4 opacity-40" />
                       </button>
                       <button 
                         onClick={() => handleStatusChange('live')}
                         className="w-full bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-bold py-4 px-6 rounded-2xl flex items-center justify-between border border-emerald-500/10 transition-all active:scale-95"
                       >
                         <span className="text-sm">Force Live State</span>
                         <Zap className="w-4 h-4 fill-current" />
                       </button>
                       <button 
                         onClick={() => handleStatusChange('delayed')}
                         className="w-full bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 font-bold py-4 px-6 rounded-2xl flex items-center justify-between border border-amber-500/10 transition-all active:scale-95"
                       >
                         <span className="text-sm">Propagate Delay</span>
                         <Clock className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => handleStatusChange('cancelled')}
                         className="w-full bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 font-bold py-4 px-6 rounded-2xl flex items-center justify-between border border-rose-500/10 transition-all active:scale-95"
                       >
                         <span className="text-sm">Terminate Event</span>
                         <XCircle className="w-4 h-4" />
                       </button>
                     </div>
                  </div>

                  <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 flex flex-col gap-6">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">Protocol Artifacts</h4>
                    <button 
                      onClick={handleExportICS}
                      className="flex items-center justify-between text-slate-300 hover:text-white font-bold transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Download className="w-5 h-5 text-indigo-400" />
                        <span>Export Calendar Identity</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                    <div className="text-[10px] text-slate-600 font-mono leading-relaxed mt-4 italic">
                      // Semantic Export Fallback Enabled<br />
                      // snapshot-only compatibility: true
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="call"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col bg-slate-950"
            >
              {/* Floating Media Header */}
              <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                  <button 
                    onClick={() => setIsJoined(false)}
                    className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 text-white hover:bg-slate-800 transition-all shadow-2xl active:scale-95"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="bg-slate-900/90 backdrop-blur-xl px-6 py-3.5 rounded-3xl border border-white/10 flex items-center gap-4 shadow-2xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white tracking-tight uppercase">{eventState.title}</span>
                      <span className="text-[9px] font-mono font-bold text-slate-500 tracking-widest">ETP STREAMING • v{eventState.version}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-3 pointer-events-auto">
                  <div className="bg-slate-900/90 backdrop-blur-xl px-4 py-3 rounded-full border border-white/5 flex items-center gap-4 text-xs font-bold text-slate-400 shadow-2xl">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>{eventState.participantCount} online</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                    <div className="flex items-center gap-2 text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>SECURE NODE</span>
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
                    toolbarButtons: ['microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen', 'fodeviceselection', 'hangup', 'profile', 'chat', 'recording', 'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand', 'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts', 'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', 'security'],
                  }}
                  interfaceConfigOverwrite={{
                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                    SHOW_JITSI_WATERMARK: false,
                    HIDE_DEEP_LINKING_LOGO: true,
                  }}
                  userInfo={{
                    displayName: 'Guest Participant',
                    email: 'guest@cmameet.etp'
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
