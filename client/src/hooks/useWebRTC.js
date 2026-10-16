import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = (roomId) => {
  const { socket, activePeers } = useSocket();

  const [localStream, setLocalStream] = useState(null);
  const [peerStreams, setPeerStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callError, setCallError] = useState(null);

  const peerConnections = useRef({}); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const isTogglingCameraRef = useRef(false);

  // Helper to create an RTCPeerConnection for a remote socket
  const createPeerConnection = useCallback((remoteSocketId) => {
    if (peerConnections.current[remoteSocketId]) {
      return peerConnections.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Send local tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Ensure a video transceiver exists even if video track is not currently in stream
    const hasVideoSender = pc.getSenders().some((s) => s.track && s.track.kind === 'video');
    if (!hasVideoSender && pc.addTransceiver) {
      try {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch (e) {
        console.debug('[WebRTC] addTransceiver video error:', e);
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-signal', {
          to: remoteSocketId,
          signal: event.candidate,
          type: 'candidate',
        });
      }
    };

    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0];
      if (!stream) {
        stream = new MediaStream();
        if (event.track) stream.addTrack(event.track);
      }
      setPeerStreams((prev) => ({
        ...prev,
        [remoteSocketId]: stream,
      }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setPeerStreams((prev) => {
          const updated = { ...prev };
          delete updated[remoteSocketId];
          return updated;
        });
      }
    };

    peerConnections.current[remoteSocketId] = pc;
    return pc;
  }, [socket]);

  // Start Call & Acquire Real Media Devices
  const startCall = useCallback(async (startAudio = true, startVideo = true) => {
    try {
      setCallError(null);
      if (localStreamRef.current) {
        setInCall(true);
        return localStreamRef.current;
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: startVideo ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } } : false,
        });
      } catch (err) {
        console.warn('getUserMedia full access failed, attempting audio-only fallback:', err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setIsCameraOff(true);
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setInCall(true);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = startAudio;
        setIsMuted(!startAudio);
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = startVideo;
        setIsCameraOff(!startVideo);
      }

      // Initiate WebRTC offer to all existing active peers
      activePeers.forEach(async (peer) => {
        if (!peer.socketId) return;
        const pc = createPeerConnection(peer.socketId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('webrtc-signal', {
            to: peer.socketId,
            signal: offer,
            type: 'offer',
          });
        } catch (e) {
          console.error(`Error creating offer to peer ${peer.socketId}:`, e);
        }
      });

      return stream;
    } catch (err) {
      console.error('Failed to access camera/mic:', err);
      setCallError('Permission to access camera or microphone was not granted.');
      return null;
    }
  }, [activePeers, createPeerConnection, socket]);

  // Leave Call
  const leaveCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};

    setLocalStream(null);
    setPeerStreams({});
    setIsScreenSharing(false);
    setInCall(false);

    if (socket && roomId) {
      socket.emit('leave-call', { roomId });
    }
  }, [socket, roomId]);

  // Toggle Microphone Mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMuted(newMuted);
        socket?.emit('media-toggle', { roomId, isMuted: newMuted });
      }
    }
  }, [socket, roomId]);

  // Toggle Camera
  const toggleCamera = useCallback(async () => {
    if (!localStreamRef.current) return;

    if (isTogglingCameraRef.current) {
      console.warn('[WebRTC] Camera toggle already in progress, ignoring rapid click.');
      return;
    }
    isTogglingCameraRef.current = true;

    try {
      if (!isCameraOff) {
        // --- TURN CAMERA OFF ---
        // Safely stop and disable video tracks to release the hardware camera sensor and turn off webcam LED
        const currentVideoTracks = localStreamRef.current.getVideoTracks();
        currentVideoTracks.forEach((track) => {
          track.enabled = false;
          try {
            track.stop();
          } catch (e) {
            console.warn('[WebRTC] Error stopping video track:', e);
          }
          localStreamRef.current.removeTrack(track);
        });

        // Set video sender track to null in all active peer connections without breaking the connection
        for (const [peerId, pc] of Object.entries(peerConnections.current)) {
          if (!pc || pc.connectionState === 'closed') continue;

          let videoSender = pc.getSenders().find(
            (s) => s.track && s.track.kind === 'video'
          );

          if (!videoSender && pc.getTransceivers) {
            const vt = pc.getTransceivers().find(
              (t) => t.sender?.track?.kind === 'video' || t.receiver?.track?.kind === 'video'
            );
            if (vt) videoSender = vt.sender;
          }

          if (videoSender) {
            try {
              await videoSender.replaceTrack(null);
            } catch (err) {
              console.warn(`[WebRTC] replaceTrack(null) failed for peer ${peerId}:`, err);
            }
          }
        }

        // Update localStream state so React re-renders without video track
        const updatedStream = new MediaStream(localStreamRef.current.getTracks());
        localStreamRef.current = updatedStream;
        setLocalStream(updatedStream);
        setIsCameraOff(true);
        socket?.emit('media-toggle', { roomId, isCameraOff: true });
      } else {
        // --- TURN CAMERA ON ---
        setCallError(null);
        let newVideoTrack = localStreamRef.current.getVideoTracks().find((t) => t.readyState === 'live');

        if (!newVideoTrack) {
          // Reacquire live camera stream using getUserMedia
          try {
            const freshStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
            });
            newVideoTrack = freshStream.getVideoTracks()[0];
            if (!newVideoTrack) {
              throw new Error('No video track returned by media device');
            }

            // Remove any old ended video tracks
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach((oldTrack) => {
                if (oldTrack !== newVideoTrack) {
                  try { oldTrack.stop(); } catch (_) {}
                  localStreamRef.current.removeTrack(oldTrack);
                }
              });
              localStreamRef.current.addTrack(newVideoTrack);
            }
          } catch (err) {
            console.error('[WebRTC] Camera re-acquisition failed:', err);
            setIsCameraOff(true);
            setCallError('Could not access camera. Please check permissions.');
            socket?.emit('media-toggle', { roomId, isCameraOff: true });
            return;
          }
        }

        // If user left call while acquiring stream
        if (!localStreamRef.current) {
          if (newVideoTrack) {
            try { newVideoTrack.stop(); } catch (_) {}
          }
          return;
        }

        newVideoTrack.enabled = true;

        // Restore video track to existing WebRTC peer connections using replaceTrack
        for (const [peerId, pc] of Object.entries(peerConnections.current)) {
          if (!pc || pc.connectionState === 'closed') continue;

          let videoSender = pc.getSenders().find(
            (s) => (s.track && s.track.kind === 'video') || (!s.track && s.track === null)
          );

          if (!videoSender && pc.getTransceivers) {
            const vt = pc.getTransceivers().find(
              (t) => t.sender?.track?.kind === 'video' || t.receiver?.track?.kind === 'video'
            );
            if (vt) videoSender = vt.sender;
          }

          if (videoSender) {
            try {
              await videoSender.replaceTrack(newVideoTrack);
            } catch (err) {
              console.warn(`[WebRTC] replaceTrack failed for peer ${peerId}, falling back to addTrack:`, err);
              try {
                pc.addTrack(newVideoTrack, localStreamRef.current);
              } catch (_) {}
            }
          } else {
            try {
              pc.addTrack(newVideoTrack, localStreamRef.current);
            } catch (err) {
              console.warn(`[WebRTC] addTrack failed for peer ${peerId}:`, err);
            }
          }
        }

        // Update localStream state with new MediaStream instance to trigger re-rendering
        const updatedStream = new MediaStream(localStreamRef.current.getTracks());
        localStreamRef.current = updatedStream;
        setLocalStream(updatedStream);
        setIsCameraOff(false);
        setCallError(null);
        socket?.emit('media-toggle', { roomId, isCameraOff: false });
      }
    } catch (err) {
      console.error('[WebRTC] Unexpected error in toggleCamera:', err);
      setCallError('Failed to toggle camera: ' + (err.message || 'Unknown error'));
    } finally {
      isTogglingCameraRef.current = false;
    }
  }, [isCameraOff, socket, roomId]);

  // Toggle Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen share
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      // Revert video track to webcam
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camTrack) {
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
        });
      }

      setIsScreenSharing(false);
      socket?.emit('media-toggle', { roomId, isScreenSharing: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = stream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        // Replace video track in all active peer connections
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack, localStreamRef.current);
          }
        });

        setIsScreenSharing(true);
        socket?.emit('media-toggle', { roomId, isScreenSharing: true });
      } catch (err) {
        console.warn('Screen share canceled or denied:', err);
      }
    }
  }, [isScreenSharing, socket, roomId]);

  // Listen to WebRTC signaling events
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async ({ from, signal, type }) => {
      try {
        let pc = peerConnections.current[from];
        if (!pc) {
          pc = createPeerConnection(from);
        }

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
          if (signal) {
            await pc.addIceCandidate(new RTCIceCandidate(signal));
          }
        }
      } catch (e) {
        console.error('Signal handling error:', e);
      }
    };

    const handleUserJoined = async ({ peer }) => {
      // If we are currently in a call, send an offer to the new participant
      if (inCall && localStreamRef.current && peer.socketId) {
        const pc = createPeerConnection(peer.socketId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-signal', {
            to: peer.socketId,
            signal: offer,
            type: 'offer',
          });
        } catch (e) {
          console.error('Error initiating offer to new peer:', e);
        }
      }
    };

    const handleUserLeft = ({ socketId }) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      setPeerStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    const handlePeerLeftCall = ({ socketId }) => {
      setPeerStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    socket.on('webrtc-signal', handleSignal);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('peer-left-call', handlePeerLeftCall);

    return () => {
      socket.off('webrtc-signal', handleSignal);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('peer-left-call', handlePeerLeftCall);
    };
  }, [socket, inCall, createPeerConnection]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, []);

  return {
    localStream,
    peerStreams,
    isMuted,
    isCameraOff,
    isScreenSharing,
    inCall,
    callError,
    startCall,
    leaveCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  };
};
