import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activePeers, setActivePeers] = useState([]);
  const [roomFullError, setRoomFullError] = useState(null);
  const currentRoomRef = useRef(null);

  const pendingJoinRef = useRef(null);

  useEffect(() => {
    const newSocket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected to signaling gateway');
      if (pendingJoinRef.current) {
        const { roomId, user: participant, mediaState } = pendingJoinRef.current;
        newSocket.emit('join-room', {
          roomId,
          user: participant,
          mediaState,
        });
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('[Socket] Disconnected from gateway');
    });

    // 10-peer maximum capacity rejection
    newSocket.on('room-full', (data) => {
      console.warn('[Socket] Room capacity limit reached:', data);
      setRoomFullError(data.message || 'Room has reached maximum capacity of 10 participants.');
    });

    newSocket.on('room-joined', ({ room, peers, yourSocketId }) => {
      setActivePeers(peers || []);
    });

    newSocket.on('user-joined', ({ peer }) => {
      setActivePeers((prev) => {
        if (prev.some((p) => p.userId === peer.userId || p.socketId === peer.socketId)) {
          return prev;
        }
        return [...prev, peer];
      });
    });

    newSocket.on('user-left', ({ socketId, userId }) => {
      setActivePeers((prev) => prev.filter((p) => p.socketId !== socketId && p.userId !== userId));
    });

    newSocket.on('peer-media-changed', ({ socketId, mediaState }) => {
      setActivePeers((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, ...mediaState } : p))
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinRoom = (roomId, userOverride, mediaState) => {
    const participant = userOverride || user;
    if (!participant || !roomId) return;
    pendingJoinRef.current = { roomId, user: participant, mediaState };
    currentRoomRef.current = roomId;
    setRoomFullError(null);
    if (socket && socket.connected) {
      socket.emit('join-room', {
        roomId,
        user: participant,
        mediaState,
      });
    }
  };

  const leaveRoom = (roomId) => {
    pendingJoinRef.current = null;
    currentRoomRef.current = null;
    if (socket) {
      socket.emit('leave-room', { roomId });
    }
    setActivePeers([]);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        activePeers,
        setActivePeers,
        roomFullError,
        setRoomFullError,
        joinRoom,
        leaveRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
