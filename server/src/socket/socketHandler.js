import * as Y from 'yjs';
import { storage } from '../services/storage.js';

// Map of socketId -> participant info { socketId, userId, name, roomId, isMuted, isCameraOff, isScreenSharing }
const activeSockets = new Map();

// Map of "roomId:filePath" -> Y.Doc
const roomDocs = new Map();

const getOrCreateDoc = (roomId, filePath, initialContent = '') => {
  const key = `${roomId}:${filePath}`;
  if (!roomDocs.has(key)) {
    const doc = new Y.Doc();
    const ytext = doc.getText('monaco');
    if (initialContent) {
      ytext.insert(0, initialContent);
    }
    roomDocs.set(key, doc);
  }
  return roomDocs.get(key);
};

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    // Ping measurement
    socket.on('ping-check', (callback) => {
      if (typeof callback === 'function') {
        callback();
      }
    });

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

        // Strict 10-peer maximum capacity check
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
          avatar: user.avatar || user.name?.substring(0, 2).toUpperCase() || 'CT',
          role: room.ownerId === (user._id || user.id) ? 'host' : 'participant',
          isMuted: mediaState?.isMuted ?? false,
          isCameraOff: mediaState?.isCameraOff ?? false,
          isScreenSharing: mediaState?.isScreenSharing ?? false,
          joinedAt: Date.now(),
        };

        activeSockets.set(socket.id, { ...participantInfo, roomId });

        // Update room participants in storage
        const currentParticipants = (room.participants || []).filter(
          p => p.userId !== (user._id || user.id)
        );
        currentParticipants.push(participantInfo);
        await storage.updateRoom(roomId, { participants: currentParticipants });

        // Collect other REAL peers in room for WebRTC mesh initiation
        const otherPeers = [];
        for (const sid of clientsInRoom) {
          if (sid !== socket.id) {
            const peer = activeSockets.get(sid);
            if (peer) otherPeers.push(peer);
          }
        }

        // Notify current user with actual room state
        socket.emit('room-joined', {
          room,
          peers: otherPeers,
          yourSocketId: socket.id,
        });

        // Notify existing peers about the new real peer
        socket.to(roomId).emit('user-joined', {
          peer: participantInfo,
        });

        console.log(`[Socket.IO] ${user.name} joined room ${roomId}. Active peers: ${clientsInRoom.size}`);
      } catch (err) {
        console.error('join-room error:', err);
        socket.emit('error-message', { message: 'Failed to join room.' });
      }
    });

    // --- YJS CRDT Real-time Code Synchronization ---
    socket.on('yjs-request-init', async ({ roomId, filePath, defaultContent }) => {
      try {
        if (!roomId || !filePath) return;
        const room = await storage.getRoomById(roomId);
        let content = defaultContent || '';
        if (room && room.files) {
          const file = room.files.find(f => f.path === filePath);
          if (file && file.content !== undefined) {
            content = file.content;
          }
        }
        const doc = getOrCreateDoc(roomId, filePath, content);
        const state = Y.encodeStateAsUpdate(doc);
        socket.emit('yjs-init', {
          filePath,
          state: Array.from(state),
          content: doc.getText('monaco').toString(),
        });
      } catch (err) {
        console.error('yjs-request-init error:', err);
      }
    });

    socket.on('yjs-update', async ({ roomId, filePath, update }) => {
      try {
        if (!roomId || !filePath || !update) return;
        const doc = getOrCreateDoc(roomId, filePath);
        Y.applyUpdate(doc, new Uint8Array(update));

        // Broadcast binary update to other peers in room
        socket.to(roomId).emit('yjs-update', {
          filePath,
          update,
          senderSocketId: socket.id,
        });

        // Persist latest string content
        const latestText = doc.getText('monaco').toString();
        await storage.updateRoomFile(roomId, filePath, latestText);
      } catch (err) {
        console.error('yjs-update error:', err);
      }
    });

    // Real-time Collaborator Cursor
    socket.on('cursor-move', ({ roomId, filePath, cursor, selection }) => {
      const peer = activeSockets.get(socket.id);
      if (!peer || !roomId) return;

      socket.to(roomId).emit('cursor-update', {
        socketId: socket.id,
        userId: peer.userId,
        name: peer.name,
        filePath,
        cursor, // { lineNumber, column }
        selection,
      });
    });

    // Direct Code Change fallback
    socket.on('code-change', async ({ roomId, filePath, content }) => {
      try {
        if (!roomId || !filePath) return;
        const doc = getOrCreateDoc(roomId, filePath);
        const ytext = doc.getText('monaco');
        if (ytext.toString() !== content) {
          doc.transact(() => {
            ytext.delete(0, ytext.length);
            ytext.insert(0, content);
          });
        }

        socket.to(roomId).emit('code-update', {
          filePath,
          content,
          senderSocketId: socket.id,
        });

        await storage.updateRoomFile(roomId, filePath, content);
      } catch (err) {
        console.error('code-change error:', err);
      }
    });

    // Language Change (with full document clear)
    socket.on('language-change', async ({ roomId, language, filePath, newPath, clearContent }) => {
      try {
        const room = await storage.getRoomById(roomId);
        if (!room) return;

        const targetPath = newPath || filePath;

        // Clear existing Yjs doc content on server
        if (clearContent) {
          if (filePath && roomDocs.has(`${roomId}:${filePath}`)) {
            const oldDoc = roomDocs.get(`${roomId}:${filePath}`);
            const oldText = oldDoc.getText('monaco');
            if (oldText.length > 0) {
              oldDoc.transact(() => {
                oldText.delete(0, oldText.length);
              });
            }
            if (newPath && filePath !== newPath) {
              roomDocs.delete(`${roomId}:${filePath}`);
            }
          }

          // Ensure target path has clean empty doc
          const doc = getOrCreateDoc(roomId, targetPath, '');
          const ytext = doc.getText('monaco');
          if (ytext.length > 0) {
            doc.transact(() => {
              ytext.delete(0, ytext.length);
            });
          }
        }

        let files = room.files || [];
        if (filePath && newPath && filePath !== newPath) {
          files = files.map(f => {
            if (f.path === filePath) {
              return {
                ...f,
                path: newPath,
                name: newPath,
                language,
                content: clearContent ? '' : f.content,
              };
            }
            return f;
          });
        } else if (filePath) {
          files = files.map(f => {
            if (f.path === filePath) {
              return {
                ...f,
                language,
                content: clearContent ? '' : f.content,
              };
            }
            return f;
          });
        }

        await storage.updateRoom(roomId, {
          language,
          files,
          activeFile: targetPath || room.activeFile,
        });

        io.to(roomId).emit('language-updated', {
          language,
          files,
          activeFile: targetPath || room.activeFile,
          clearContent: !!clearContent,
        });

        console.log(`[Socket.IO] Room ${roomId} language changed to ${language}, document cleared: ${!!clearContent}`);
      } catch (err) {
        console.error('language-change error:', err);
      }
    });

    // File operations
    socket.on('file-created', async ({ roomId, file }) => {
      try {
        const room = await storage.getRoomById(roomId);
        if (!room) return;
        const files = [...(room.files || []), file];
        await storage.updateRoom(roomId, { files, activeFile: file.path });

        // Initialize Yjs doc for new file
        getOrCreateDoc(roomId, file.path, file.content || '');

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
        const newActive = files.length > 0 ? files[0].path : 'main.js';
        await storage.updateRoom(roomId, { files, activeFile: newActive });
        roomDocs.delete(`${roomId}:${filePath}`);
        io.to(roomId).emit('files-updated', { files, activeFile: newActive });
      } catch (err) {
        console.error('file-deleted error:', err);
      }
    });

    // --- WebRTC Signaling ---
    socket.on('webrtc-signal', ({ to, signal, type }) => {
      const sender = activeSockets.get(socket.id);
      io.to(to).emit('webrtc-signal', {
        from: socket.id,
        signal,
        type,
        sender,
      });
    });

    // Media state toggles (Mic, Cam, Screen Share)
    socket.on('media-toggle', ({ roomId, isMuted, isCameraOff, isScreenSharing }) => {
      const peer = activeSockets.get(socket.id);
      if (peer) {
        if (isMuted !== undefined) peer.isMuted = isMuted;
        if (isCameraOff !== undefined) peer.isCameraOff = isCameraOff;
        if (isScreenSharing !== undefined) peer.isScreenSharing = isScreenSharing;

        socket.to(roomId).emit('peer-media-changed', {
          socketId: socket.id,
          userId: peer.userId,
          mediaState: {
            isMuted: peer.isMuted,
            isCameraOff: peer.isCameraOff,
            isScreenSharing: peer.isScreenSharing,
          },
        });
      }
    });

    // Leave call explicit
    socket.on('leave-call', ({ roomId }) => {
      const peer = activeSockets.get(socket.id);
      if (peer) {
        peer.isCameraOff = true;
        peer.isMuted = true;
        peer.isScreenSharing = false;
        socket.to(roomId).emit('peer-left-call', {
          socketId: socket.id,
          userId: peer.userId,
        });
      }
    });

    // --- Whiteboard Real-Time Sync ---
    socket.on('whiteboard-draw-step', ({ roomId, currentStroke }) => {
      socket.to(roomId).emit('whiteboard-draw-step', {
        currentStroke,
        senderSocketId: socket.id,
      });
    });

    socket.on('whiteboard-update', async ({ roomId, elements, viewport }) => {
      socket.to(roomId).emit('whiteboard-state-sync', {
        elements,
        viewport,
        senderSocketId: socket.id,
      });
      await storage.updateWhiteboard(roomId, { elements, viewport });
    });

    socket.on('whiteboard-clear', async ({ roomId }) => {
      socket.to(roomId).emit('whiteboard-cleared', { senderSocketId: socket.id });
      await storage.updateWhiteboard(roomId, { elements: [] });
    });

    // Leave room explicit
    socket.on('leave-room', async ({ roomId }) => {
      const peer = activeSockets.get(socket.id);
      if (peer) {
        activeSockets.delete(socket.id);
        socket.leave(roomId);
        socket.to(roomId).emit('user-left', {
          socketId: socket.id,
          userId: peer.userId,
          name: peer.name,
        });

        const room = await storage.getRoomById(roomId);
        if (room) {
          const filtered = (room.participants || []).filter(p => p.socketId !== socket.id);
          await storage.updateRoom(roomId, { participants: filtered });
        }
      }
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
