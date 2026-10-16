import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

// Ice servers configuration with STUN and free TURN relays
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = (roomId) => {
  const { socket, activePeers } = useSocket();
  const { user } = useAuth();

  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [peerStreams, setPeerStreams] = useState({});
  const [activeSpeaker, setActiveSpeaker] = useState('Sarah Connor');
  const [error, setError] = useState(null);

  const peerConnections = useRef({});
  const localStreamRef = useRef(null);

  // Initialize Local Media
  const initMedia = useCallback(async (audioInitial = true, videoInitial = true) => {
    try {
      if (localStreamRef.current) return localStreamRef.current;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      }).catch(err => {
        console.warn('getUserMedia camera/mic fallback:', err);
        // Fallback: create mock canvas video track + silent audio track
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#121724';
        ctx.fillRect(0, 0, 640, 480);
        ctx.font = '24px sans-serif';
        ctx.fillStyle = '#38BDF8';
        ctx.fillText('Webcam Offline', 240, 240);
        const videoTrack = canvas.captureStream(10).getVideoTracks()[0];
        
        // Mock audio track using AudioContext
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const dst = osc.connect(audioCtx.createMediaStreamDestination());
        osc.start();
        const audioTrack = dst.stream.getAudioTracks()[0];
        audioTrack.enabled = false;

        return new MediaStream([videoTrack, audioTrack]);
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      if (!audioInitial) {
        stream.getAudioTracks().forEach(t => t.enabled = false);
        setIsMuted(true);
      }
      if (!videoInitial) {
        stream.getVideoTracks().forEach(t => t.enabled = false);
        setIsCameraOff(true);
      }

      return stream;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      setError('Camera/Microphone access not granted.');
      return null;
    }
  }, []);

  // Toggle Microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      if (socket && roomId) {
        socket.emit('media-toggle', { roomId, isMuted: newMuted });
      }
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      const newCameraOff = !isCameraOff;
      setIsCameraOff(newCameraOff);
      if (socket && roomId) {
        socket.emit('media-toggle', { roomId, isCameraOff: newCameraOff });
      }
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        if (screenStream) {
          screenStream.getTracks().forEach(t => t.stop());
        }
        setScreenStream(null);
        setIsScreenSharing(false);
        if (socket && roomId) {
          socket.emit('media-toggle', { roomId, isScreenSharing: false });
        }
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });

        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
          if (socket && roomId) {
            socket.emit('media-toggle', { roomId, isScreenSharing: false });
          }
        };

        setScreenStream(stream);
        setIsScreenSharing(true);
        if (socket && roomId) {
          socket.emit('media-toggle', { roomId, isScreenSharing: true });
        }
      }
    } catch (err) {
      console.warn('Screen share canceled or not supported:', err);
    }
  };

  // Toggle Hand Raise
  const toggleHandRaise = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (socket && roomId) {
      socket.emit('media-toggle', { roomId, isHandRaised: nextState });
    }
  };

  // WebRTC Signaling Handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc-signal', async ({ from, signal, type, sender }) => {
      let pc = peerConnections.current[from];

      if (!pc) {
        pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[from] = pc;

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current);
          });
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc-signal', {
              to: from,
              signal: event.candidate,
              type: 'candidate',
            });
          }
        };

        pc.ontrack = (event) => {
          setPeerStreams(prev => ({
            ...prev,
            [from]: event.streams[0],
          }));
        };
      }

      try {
        if (type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc-signal', {
            to: from,
            signal: answer,
            type: 'answer',
          });
        } else if (type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (type === 'candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(signal));
        }
      } catch (e) {
        console.error('WebRTC signal processing error:', e);
      }
    });

    socket.on('peer-media-changed', ({ socketId, mediaState }) => {
      // Updates are automatically reflected via socket room state
    });

    return () => {
      socket.off('webrtc-signal');
      socket.off('peer-media-changed');
    };
  }, [socket]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, []);

  return {
    localStream,
    screenStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    peerStreams,
    activeSpeaker,
    error,
    initMedia,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    toggleHandRaise,
  };
};
