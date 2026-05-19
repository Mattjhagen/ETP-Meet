import { useEffect, useState, useRef } from 'react';
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
  MoreVertical
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

  if (resolving) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-100 min-h-screen gap-4">
        <Zap className="w-12 h-12 text-indigo-500 animate-pulse" />
        <div className="text-slate-400 font-mono text-sm tracking-widest uppercase">Resolving EID Sequence...</div>
      </div>
    );
  }

  if (!eventState && !resolving && eid) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
              <XCircle className="w-12 h-12 text-rose-500" />
              <div className="text-slate-900 font-bold">Event sequence invalid or corrupted.</div>
              <button onClick={() => navigate('/')} className="text-indigo-600 font-bold underline">Return to Node</button>
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

  const handleJitsiIFrameRef1 = (iframeRef: HTMLDivElement) => {
    iframeRef.style.height = '100%';
    iframeRef.style.width = '100%';
  };

  const handleApiReady = (apiObj: any) => {
    jitsiApiRef.current = apiObj;
    apiObj.on('videoConferenceJoined', () => {
      console.log('Joined Jitsi Conference');
    });
    apiObj.on('readyToClose', () => {
      setIsJoined(false);
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Top Protocol Bar */}
      <div className="bg-slate-900 text-white px-6 py-2 flex items-center justify-between font-mono text-[10px] tracking-[0.2em] uppercase shrink-0 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-ping'}`} />
            <span>ETP Status: {syncStatus}</span>
          </div>
          <div className="hidden md:block text-slate-500 border-l border-slate-800 ml-2 pl-4">Node: cmameet-authoritative</div>
          <div className="hidden md:block text-slate-500 border-l border-slate-800 ml-2 pl-4 px-2">ID: {eventState.eid}</div>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-slate-800 px-2 rounded">v{eventState.version}</span>
          {lastUpdate && <span className="text-indigo-400 hidden sm:block">Sync: {new Date(lastUpdate).toLocaleTimeString()}</span>}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!isJoined ? (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 container mx-auto px-6 py-8 md:py-12 flex flex-col"
            >
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm mb-8 transition-colors group w-fit"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Return to Dashboard
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                  <header>
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-600 text-white tracking-widest uppercase shadow-sm">
                        Authoritative EVT
                      </span>
                      <motion.span 
                        key={eventState.lifecycle}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded tracking-widest uppercase border ${
                          eventState.lifecycle === 'live' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : eventState.lifecycle === 'cancelled'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : eventState.lifecycle === 'delayed'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                        }`}
                      >
                        {eventState.lifecycle}
                      </motion.span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight mb-4">
                      {eventState.title}
                    </h1>
                    <p className="text-lg text-slate-400 font-medium">
                      Hosted by <span className="text-white font-bold">{eventState.organizer}</span>
                    </p>
                  </header>

                  <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02] -rotate-12 transition-transform group-hover:scale-110">
                      <Video className="w-64 h-64" />
                    </div>
                    <div className="relative z-10 grid md:grid-cols-2 gap-10">
                      <div className="space-y-8">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                            <Clock className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Scheduled On-Air</div>
                            <div className="text-xl font-bold text-white tabular-nums">{new Date(eventState.scheduledTime).toLocaleString()}</div>
                            <div className="text-sm text-slate-500 font-medium mt-1 italic">{eventState.recurrence} ETP Bloom</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <Settings className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Media Configuration</div>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                                <Video className="w-4 h-4" />
                              </div>
                              <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                                <Mic className="w-4 h-4" />
                              </div>
                              <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                                <MessageSquare className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-end">
                        <button 
                          onClick={() => setIsJoined(true)}
                          disabled={eventState.lifecycle === 'cancelled'}
                          className="w-full bg-indigo-600 text-white font-bold py-6 rounded-[1.5rem] flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-900/40 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:scale-100"
                        >
                          <Monitor className="w-6 h-6" />
                          <span className="text-lg">INITIALIZE FEED</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <div className="bg-slate-900 text-white rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2.5">
                      <Zap className="w-5 h-5 text-indigo-400" />
                      Authoritative Controls
                    </h3>
                    <div className="space-y-3">
                      <button 
                        onClick={handleUpdateUrl}
                        className="w-full bg-white/5 hover:bg-white/10 text-white/90 font-bold py-3.5 px-5 rounded-[1rem] flex items-center justify-between transition-all border border-white/10"
                      >
                        <span className="text-sm">Rotate Room Key</span>
                        <RefreshCcw className="w-4 h-4 opacity-40" />
                      </button>
                      <button 
                        onClick={() => handleStatusChange('live')}
                        className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-3.5 px-5 rounded-[1rem] flex items-center justify-between border border-emerald-500/20"
                      >
                        <span className="text-sm">Go Live</span>
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                      <button 
                        onClick={() => handleStatusChange('delayed')}
                        className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold py-3.5 px-5 rounded-[1rem] flex items-center justify-between border border-amber-500/20"
                      >
                        <span className="text-sm">Delay Event</span>
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusChange('cancelled')}
                        className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-3.5 px-5 rounded-[1rem] flex items-center justify-between border border-rose-500/20"
                      >
                        <span className="text-sm">Cancel Meeting</span>
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-[2rem] border border-white/5 p-8">
                     <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Sync Log</h4>
                     <div className="space-y-4 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                       <div className="text-[10px] font-mono text-slate-500">
                         Snapshot sequence loaded.
                       </div>
                       {lastUpdate && (
                         <div className="text-[10px] font-mono text-indigo-400">
                           {new Date(lastUpdate).toLocaleTimeString()} - delta.sync received v{eventState.version}
                         </div>
                       )}
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
              className="flex-1 flex flex-col bg-slate-900"
            >
              <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
                <button 
                  onClick={() => setIsJoined(false)}
                  className="bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-white hover:bg-slate-800 transition-colors shadow-2xl"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-xs font-bold text-white tracking-tight">{eventState.title}</span>
                  <span className="text-[10px] font-mono text-slate-500">v{eventState.version}</span>
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
                    prejoinPageEnabled: false
                  }}
                  interfaceConfigOverwrite={{
                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
