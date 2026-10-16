import React, { useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  PhoneCall,
  Users,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

// Single Video Tile component to bind MediaStream reliably
const VideoTile = ({ stream, isLocal = false, isCameraOff, name, isMuted }) => {
  const videoRef = useRef(null);
  const [trackUpdate, setTrackUpdate] = React.useState(0);

  // Monitor live tracks and track lifecycle events
  useEffect(() => {
    if (!stream) return;
    const forceUpdate = () => setTrackUpdate((c) => c + 1);

    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.addEventListener('ended', forceUpdate);
      track.addEventListener('mute', forceUpdate);
      track.addEventListener('unmute', forceUpdate);
    });

    stream.addEventListener('addtrack', forceUpdate);
    stream.addEventListener('removetrack', forceUpdate);

    return () => {
      videoTracks.forEach((track) => {
        track.removeEventListener('ended', forceUpdate);
        track.removeEventListener('mute', forceUpdate);
        track.removeEventListener('unmute', forceUpdate);
      });
      stream.removeEventListener('addtrack', forceUpdate);
      stream.removeEventListener('removetrack', forceUpdate);
    };
  }, [stream]);

  const hasLiveVideoTrack = Boolean(
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
  );

  const shouldShowVideo = hasLiveVideoTrack && !isCameraOff;
  const initials = (name || 'Dev').substring(0, 2).toUpperCase();

  // Attach stream and manage playback
  const bindStream = React.useCallback((videoEl) => {
    if (!videoEl) return;
    if (stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      if (shouldShowVideo) {
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.debug('[VideoTile] play() error handled:', err);
          });
        }
      } else {
        videoEl.pause();
      }
    } else {
      videoEl.srcObject = null;
    }
  }, [stream, shouldShowVideo]);

  // Callback ref guarantees immediate binding when DOM node mounts
  const handleVideoRef = React.useCallback((node) => {
    videoRef.current = node;
    bindStream(node);
  }, [bindStream]);

  // Also bind when stream, visibility, or trackUpdate changes
  useEffect(() => {
    bindStream(videoRef.current);
  }, [bindStream, trackUpdate]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-[#171B22] border border-[#303744] aspect-video flex items-center justify-center shadow-md">
      {/* Video element is permanently mounted to preserve hardware decoding & stream binding */}
      <video
        ref={handleVideoRef}
        autoPlay
        playsInline
        muted={isLocal}
        onLoadedMetadata={(e) => {
          if (shouldShowVideo) {
            e.target.play().catch(() => {});
          }
        }}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLocal ? '-scale-x-100' : ''
        } ${shouldShowVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Fallback avatar placeholder shown when camera is off or no live video */}
      {!shouldShowVideo && (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-[#1D232D] space-y-1">
          <div className="w-10 h-10 rounded-full bg-[#7C9CFF]/15 border border-[#7C9CFF]/30 text-[#7C9CFF] flex items-center justify-center font-bold text-sm">
            {initials}
          </div>
          <span className="text-[10px] text-[#9AA5B5] font-mono">Camera Off</span>
        </div>
      )}

      {/* Name and mic status pill */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none z-10">
        <span className="bg-[#101318]/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-[#F1F4F9] font-medium truncate max-w-[120px]">
          {isLocal ? `${name || 'You'} (You)` : name || 'Peer'}
        </span>
        <div className="bg-[#101318]/80 backdrop-blur-sm p-1 rounded">
          {isMuted ? (
            <MicOff className="w-2.5 h-2.5 text-rose-400" />
          ) : (
            <Mic className="w-2.5 h-2.5 text-[#66D9C1]" />
          )}
        </div>
      </div>
    </div>
  );
};

export const VideoCallPanel = ({
  localStream,
  peerStreams,
  activePeers,
  currentUser,
  isMuted,
  isCameraOff,
  isScreenSharing,
  inCall,
  callError,
  onStartCall,
  onLeaveCall,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <div className="bg-[#171B22] border-l border-[#303744] flex flex-col shrink-0 transition-all duration-200 select-none w-72 md:w-80">
      {/* Call Header */}
      <div className="h-11 px-3 bg-[#101318] border-b border-[#303744] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${inCall ? 'bg-[#66D9C1] animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-xs font-bold text-[#F1F4F9]">
            {inCall ? 'Live Call' : 'Voice & Video'}
          </span>
          <span className="text-[10px] font-mono text-[#9AA5B5]">
            ({inCall ? (activePeers.length + 1) : 0}/10)
          </span>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-[#1D232D] text-[#9AA5B5] hover:text-[#F1F4F9] transition-colors"
          title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden p-3 space-y-3">
          {/* Call Error Banner */}
          {callError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{callError}</span>
            </div>
          )}

          {/* Videos Grid or Not-in-call state */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {inCall ? (
              <div className="grid grid-cols-1 gap-2">
                {/* Local user tile */}
                <VideoTile
                  stream={localStream}
                  isLocal={true}
                  isCameraOff={isCameraOff}
                  name={currentUser?.name || 'You'}
                  isMuted={isMuted}
                />

                {/* Remote peer tiles */}
                {activePeers.map((peer) => (
                  <VideoTile
                    key={peer.socketId}
                    stream={peerStreams[peer.socketId]}
                    isLocal={false}
                    isCameraOff={peer.isCameraOff}
                    name={peer.name}
                    isMuted={peer.isMuted}
                  />
                ))}

                {activePeers.length === 0 && (
                  <div className="text-center py-4 px-2 bg-[#1D232D]/40 rounded-xl border border-dashed border-[#303744] text-[#9AA5B5] text-xs">
                    <Users className="w-5 h-5 mx-auto mb-1 text-[#7C9CFF]" />
                    <p className="font-semibold text-[#F1F4F9]">You are the only one in the call</p>
                    <p className="text-[11px] text-[#9AA5B5] mt-0.5">Share room code to invite up to 9 peers.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#7C9CFF]/10 border border-[#7C9CFF]/20 flex items-center justify-center text-[#7C9CFF]">
                  <PhoneCall className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F1F4F9]">Start Voice & Video</h4>
                  <p className="text-xs text-[#9AA5B5] mt-1">
                    Connect real P2P audio, video, and screen sharing with your collaborators.
                  </p>
                </div>
                <button
                  id="btn-join-call"
                  onClick={() => onStartCall(true, true)}
                  className="w-full py-2 px-4 rounded-xl bg-[#7C9CFF] hover:bg-[#688DFE] text-[#101318] font-bold text-xs shadow-md shadow-[#7C9CFF]/25 transition-all flex items-center justify-center space-x-2"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Join Call</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Call Controls Bar */}
          {inCall && (
            <div className="pt-2 border-t border-[#303744]">
              <div className="flex items-center justify-between bg-[#101318] p-1.5 rounded-xl border border-[#303744]">
                {/* Mute */}
                <button
                  id="btn-toggle-mute"
                  onClick={onToggleMute}
                  title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  className={`p-2 rounded-lg transition-colors ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                      : 'bg-[#1D232D] text-[#66D9C1] hover:bg-[#252E3B]'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Camera */}
                <button
                  id="btn-toggle-camera"
                  onClick={onToggleCamera}
                  title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                  className={`p-2 rounded-lg transition-colors ${
                    isCameraOff
                      ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                      : 'bg-[#1D232D] text-[#7C9CFF] hover:bg-[#252E3B]'
                  }`}
                >
                  {isCameraOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
                </button>

                {/* Screen share */}
                <button
                  id="btn-toggle-screen"
                  onClick={onToggleScreenShare}
                  title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                  className={`p-2 rounded-lg transition-colors ${
                    isScreenSharing
                      ? 'bg-[#7C9CFF] text-[#101318] font-bold'
                      : 'bg-[#1D232D] text-[#F1F4F9] hover:bg-[#252E3B]'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </button>

                {/* Leave Call */}
                <button
                  id="btn-leave-call"
                  onClick={onLeaveCall}
                  title="Leave Call"
                  className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
