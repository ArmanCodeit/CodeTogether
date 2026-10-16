import { storage } from '../services/storage.js';

// Map of socketId -> { userId, name, roomId, avatar, role }
const activeSockets = new Map();

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room
    socket.on('join-room', async ({ roomId, user, mediaState }) => {
      try {
        if (!roomId || !user) return;

        const room = await storage.getRoomById(roomId);
        if (!room) {
          socket.emit('error-message', { message: 'Room not found.' });
          return;
        }

        // Check active peers in this socket room
        const clientsInRoom = io.sockets.adapter.rooms.get(roomId) || new Set();
        const alreadyInRoom = Array.from(clientsInRoom).some(sid => {
          const s = activeSockets.get(sid);
          return s && s.userId === (user._id || user.id);
        });

        // Atomic 10-peer capacity check
        if (!alreadyInRoom && clientsInRoom.size >= (room.maxCapacity || 10)) {
          socket.emit('room-full', {
            message: 'Room capacity reached (10/10 active peers). Connection rejected to prevent synchronization failure.',
            maxCapacity: room.maxCapacity || 10,
          });
          return;
        }

        socket.join(roomId);

        const participantInfo = {
          socketId: socket.id,
          userId: user._id || user.id,
          name: user.name || 'Anonymous Peer',
          avatar: user.avatar || 'CT',
          handle: user.handle || '@dev',
          role: user.role || 'participant',
          isMuted: mediaState?.isMuted ?? false,
          isCameraOff: mediaState?.isCameraOff ?? false,
          isScreenSharing: mediaState?.isScreenSharing ?? false,
          isHandRaised: false,
          status: 'Active',
          joinedAt: Date.now(),
        };

        activeSockets.set(socket.id, { ...participantInfo, roomId });

        // Update room participants in storage
        const currentParticipants = (room.participants || []).filter(
          p => p.userId !== (user._id || user.id)
        );
        currentParticipants.push(participantInfo);
        await storage.updateRoom(roomId, { participants: currentParticipants });

        // Collect other peers in room for WebRTC mesh initiation
        const otherPeers = [];
        for (const sid of clientsInRoom) {
          if (sid !== socket.id) {
            const peer = activeSockets.get(sid);
            if (peer) otherPeers.push(peer);
          }
        }

        // Notify current user with full room state
        socket.emit('room-joined', {
          room,
          peers: otherPeers,
          yourSocketId: socket.id,
        });

        // Notify existing peers about the newcomer
        socket.to(roomId).emit('user-joined', {
          peer: participantInfo,
        });

        console.log(`[Socket.IO] ${user.name} joined room ${roomId}. Active peers: ${clientsInRoom.size}`);
      } catch (err) {
        console.error('join-room error:', err);
        socket.emit('error-message', { message: 'Failed to join room.' });
      }
    });

    // Real-time Collaborative Code Changes
    socket.on('code-change', async ({ roomId, filePath, content, version }) => {
      try {
        if (!roomId || !filePath) return;
        // Broadcast to all other peers in room
        socket.to(roomId).emit('code-update', {
          filePath,
          content,
          senderSocketId: socket.id,
          version,
        });

        // Debounced or direct update to storage
        await storage.updateRoomFile(roomId, filePath, content);
      } catch (err) {
        console.error('code-change error:', err);
      }
    });

    // Real-time Collaborator Cursor & Selection
    socket.on('cursor-move', ({ roomId, filePath, cursor, selection }) => {
      const peer = activeSockets.get(socket.id);
      if (!peer || !roomId) return;

      socket.to(roomId).emit('cursor-update', {
        socketId: socket.id,
        userId: peer.userId,
        name: peer.name,
        avatar: peer.avatar,
        filePath,
        cursor, // { lineNumber, column }
        selection,
      });
    });

    // File operations
    socket.on('file-created', async ({ roomId, file }) => {
      try {
        const room = await storage.getRoomById(roomId);
        if (!room) return;
        const files = [...(room.files || []), file];
        await storage.updateRoom(roomId, { files });
        io.to(roomId).emit('files-updated', { files, activeFile: file.path });
      } catch (err) {
        console.error('file-created error:', err);
      }
    });

    socket.on('file-deleted', async ({ roomId, filePath }) => {
      try {
        const room = await storage.getRoomById(roomId);
        if (!room) return;
        const files = (room.files || []).filter(f => f.path !== filePath);
        await storage.updateRoom(roomId, { files });
        io.to(roomId).emit('files-updated', { files });
      } catch (err) {
        console.error('file-deleted error:', err);
      }
    });

    // WebRTC Signaling
    socket.on('webrtc-signal', ({ to, signal, type }) => {
      const sender = activeSockets.get(socket.id);
      io.to(to).emit('webrtc-signal', {
        from: socket.id,
        signal,
        type,
        sender,
      });
    });

    // Media state toggles (Mic, Cam, Screen Share, Hand Raise)
    socket.on('media-toggle', ({ roomId, isMuted, isCameraOff, isScreenSharing, isHandRaised }) => {
      const peer = activeSockets.get(socket.id);
      if (peer) {
        if (isMuted !== undefined) peer.isMuted = isMuted;
        if (isCameraOff !== undefined) peer.isCameraOff = isCameraOff;
        if (isScreenSharing !== undefined) peer.isScreenSharing = isScreenSharing;
        if (isHandRaised !== undefined) peer.isHandRaised = isHandRaised;

        socket.to(roomId).emit('peer-media-changed', {
          socketId: socket.id,
          userId: peer.userId,
          mediaState: {
            isMuted: peer.isMuted,
            isCameraOff: peer.isCameraOff,
            isScreenSharing: peer.isScreenSharing,
            isHandRaised: peer.isHandRaised,
          },
        });
      }
    });

    // Whiteboard Real-Time Sync
    socket.on('whiteboard-draw', ({ roomId, element }) => {
      socket.to(roomId).emit('whiteboard-element-added', { element });
    });

    socket.on('whiteboard-update', async ({ roomId, elements, viewport, title }) => {
      socket.to(roomId).emit('whiteboard-state-sync', { elements, viewport, title });
      await storage.updateWhiteboard(roomId, { elements, viewport, title });
    });

    socket.on('whiteboard-cursor', ({ roomId, x, y }) => {
      const peer = activeSockets.get(socket.id);
      if (peer && roomId) {
        socket.to(roomId).emit('whiteboard-cursor-move', {
          socketId: socket.id,
          name: peer.name,
          color: '#38BDF8',
          x,
          y,
        });
      }
    });

    socket.on('whiteboard-clear', async ({ roomId }) => {
      socket.to(roomId).emit('whiteboard-cleared');
      await storage.updateWhiteboard(roomId, { elements: [] });
    });

    // Chat Message
    socket.on('send-chat-message', async ({ roomId, text, codeSnippet }) => {
      try {
        const peer = activeSockets.get(socket.id);
        if (!peer || !text?.trim()) return;

        const newMsg = await storage.createChatMessage({
          roomId,
          senderId: peer.userId,
          senderName: peer.name,
          senderAvatar: peer.avatar,
          text: text.trim(),
          codeSnippet: codeSnippet || null,
          reactions: [],
        });

        io.to(roomId).emit('new-chat-message', newMsg);
      } catch (err) {
        console.error('send-chat-message error:', err);
      }
    });

    // Run Tests / Console execution mock stream
    socket.on('run-tests', ({ roomId }) => {
      const logs = [
        { time: new Date().toLocaleTimeString(), type: 'info', text: 'INIT: Triggering test suite for @codetogether/cluster-mesh...' },
        { time: new Date().toLocaleTimeString(), type: 'stdout', text: 'PASS src/services/auth-cluster.test.ts (3 passed, 0 failed)' },
        { time: new Date().toLocaleTimeString(), type: 'stdout', text: '  ✓ AuthClusterMesh > verifies HMAC SHA-512 session ticket (14ms)' },
        { time: new Date().toLocaleTimeString(), type: 'stdout', text: '  ✓ AuthClusterMesh > enforces sliding window rate limit threshold (8ms)' },
        { time: new Date().toLocaleTimeString(), type: 'stdout', text: '  ✓ AuthClusterMesh > purges stale redis sliding log keys (6ms)' },
        { time: new Date().toLocaleTimeString(), type: 'success', text: 'All 3 test suites passed! Coverage: 94.2% statements.' },
      ];

      io.to(roomId).emit('test-run-output', { logs });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      const peer = activeSockets.get(socket.id);
      if (peer) {
        const { roomId, userId, name } = peer;
        activeSockets.delete(socket.id);

        socket.to(roomId).emit('user-left', {
          socketId: socket.id,
          userId,
          name,
        });

        // Clean up room participant list if needed
        try {
          const room = await storage.getRoomById(roomId);
          if (room) {
            const filtered = (room.participants || []).filter(p => p.socketId !== socket.id);
            await storage.updateRoom(roomId, { participants: filtered });
          }
        } catch (e) {
          // Ignore cleanup errors
        }

        console.log(`[Socket.IO] ${name} disconnected from ${roomId}`);
      }
    });
  });
};
