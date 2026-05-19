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
  ShieldAlert,
  Lock,
  Unlock,
  Key
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
  const [pinInput, setPinInput] = useState('');
  const [isPinValid, setIsPinValid] = useState(false);

  const handleUpdateUrl = () => {
    const newRoomName = `live-${Math.random().toString(36).substring(7)}`;
    mutate({ roomName: newRoomName });
  };

  const handleStatusChange = (status: 'scheduled' | 'live' | 'delayed' | 'cancelled') => {
    mutate({ lifecycle: status });
  };

  const handleJoin = () => {
    if (eventState.privacy === 'private' && !isPinValid) {
      if (pinInput === eventState.pin) {
        setIsPinValid(true);
        setIsJoined(true);
      } else {
        alert("Incorrect PIN");
      }
    } else {
      setIsJoined(true);
    }
  };

  const handleExportICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CMAMeet//ETP Reference//EN
BEGIN:VEVENT
UID:${eventState.eid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${eventState.scheduledTime.replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${eventState.title}${eventState.privacy === 'private' ? ' [PRIVATE]' : ''}
DESCRIPTION:${eventState.description || 'Live ETP Meeting'}${eventState.pin ? `\\n\\nMeeting PIN: ${eventState.pin}` : ''}
LOCATION:${window.location.origin}/join/${eventState.slug || eventState.eid}
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

      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        <AnimatePresence mode="wait">
          {!isJoined ? (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col items-center justify-center p-6"
            >
              <div className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-12 md:p-16 shadow-2xl relative overflow-hidden">
                <button 
                  onClick={() => navigate('/')}
                  className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-white font-black text-[9px] uppercase tracking-[0.2em] transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </button>

                <div className="text-center space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full tracking-widest uppercase border ${
                        eventState.lifecycle === 'live' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-white/10 text-slate-500'
                      }`}>
                        {eventState.lifecycle}
                      </span>
                      {eventState.privacy === 'private' && (
                        <span className="flex items-center gap-1.5 text-[9px] font-black px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full tracking-widest uppercase">
                          <Lock className="w-3 h-3" />
                          Private
                        </span>
                      )}
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                      {eventState.title}
                    </h1>
                    <p className="text-slate-400 text-lg font-medium max-w-md mx-auto">
                      {eventState.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-8 border-y border-white/5">
                    <div className="text-center">
                      <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Time</div>
                      <div className="text-xl font-bold text-white tabular-nums">
                        {new Date(eventState.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Presence</div>
                      <div className="text-xl font-bold text-white">
                        {eventState.participantCount} Active
                      </div>
                    </div>
                  </div>

                  {eventState.privacy === 'private' && !isPinValid && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enter Meeting PIN</div>
                      <input 
                        type="password"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 text-center text-2xl font-black tracking-[0.5em] focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-6">
                    <button 
                      onClick={handleJoin}
                      disabled={eventState.lifecycle === 'cancelled'}
                      className="w-full bg-white text-slate-950 font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-20"
                    >
                      <Monitor className="w-6 h-6" />
                      <span className="text-xl tracking-tighter uppercase font-black">Enter Room</span>
                    </button>
                    
                    <div className="flex items-center justify-center gap-6">
                      <button onClick={handleExportICS} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
                        <Download className="w-3.5 h-3.5" />
                        Save to Calendar
                      </button>
                      <div className="w-px h-3 bg-white/10" />
                      <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                        <Activity className="w-3.5 h-3.5" />
                        Live Synchronized
                      </div>
                    </div>
                  </div>
                </div>

                {/* Small Host Controls */}
                <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
                  <button onClick={() => handleStatusChange('live')} className="text-[9px] font-black px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full hover:bg-emerald-500/20 transition-all uppercase tracking-widest">Go Live</button>
                  <button onClick={handleUpdateUrl} className="text-[9px] font-black px-4 py-2 bg-white/5 text-slate-400 border border-white/10 rounded-full hover:bg-white/10 transition-all uppercase tracking-widest flex items-center gap-2">
                    <RefreshCcw className="w-3 h-3" />
                    Rotate Link
                  </button>
                  {eventState.privacy === 'private' && (
                    <div className="text-[9px] font-black px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full uppercase tracking-widest flex items-center gap-2">
                      <Key className="w-3 h-3" />
                      PIN: {eventState.pin}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="call"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col bg-slate-950 h-full relative"
            >
              {/* Discrete Inline Header (Top Right) */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
                <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    <span>{eventState.participantCount}</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <span>{eventState.title}</span>
                </div>
                <button 
                  onClick={() => setIsJoined(false)}
                  className="bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-500 p-2 rounded-full transition-all active:scale-90"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 h-full w-full">
                <JitsiMeeting
                  domain="meet.jit.si"
                  roomName={eventState.roomName}
                  configOverwrite={{
                    startWithAudioMuted: true,
                    disableModeratorIndicator: true,
                    startScreenSharing: true,
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
