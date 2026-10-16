import { storage } from '../services/storage.js';
import {
  DEFAULT_AUTH_CLUSTER_CODE,
  DEFAULT_INDEX_CODE,
  DEFAULT_TYPES_CODE,
  DEFAULT_PACKAGE_CODE,
  DEFAULT_DOCKER_CODE,
} from '../services/seedData.js';

export const createRoom = async (req, res) => {
  try {
    const { name, language, accessPolicy } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Room name is required.' });
    }

    const cleanSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const roomId = `cdt-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    const user = req.user;

    // Default starter files based on language
    let starterFiles = [];
    let activeFile = 'index.ts';

    if (language?.toLowerCase().includes('python')) {
      starterFiles = [
        { name: 'main.py', path: 'main.py', language: 'python', content: '# Python collaborative session\ndef run():\n    print("Hello from CodeTogether!")\n\nif __name__ == "__main__":\n    run()\n' },
        { name: 'test_main.py', path: 'test_main.py', language: 'python', content: 'def test_example():\n    assert 1 + 1 == 2\n' }
      ];
      activeFile = 'main.py';
    } else if (language?.toLowerCase().includes('go')) {
      starterFiles = [
        { name: 'main.go', path: 'main.go', language: 'go', content: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("CodeTogether Go Runner")\n}\n' }
      ];
      activeFile = 'main.go';
    } else if (language?.toLowerCase().includes('rust')) {
      starterFiles = [
        { name: 'main.rs', path: 'src/main.rs', language: 'rust', content: 'fn main() {\n    println!("CodeTogether Rust Session");\n}\n' },
        { name: 'Cargo.toml', path: 'Cargo.toml', language: 'toml', content: '[package]\nname = "session"\nversion = "0.1.0"\nedition = "2021"\n' }
      ];
      activeFile = 'src/main.rs';
    } else {
      // TypeScript / JavaScript
      starterFiles = [
        { name: 'auth-cluster.ts', path: 'src/services/auth-cluster.ts', language: 'typescript', content: DEFAULT_AUTH_CLUSTER_CODE },
        { name: 'index.ts', path: 'src/services/index.ts', language: 'typescript', content: DEFAULT_INDEX_CODE },
        { name: 'types.d.ts', path: 'src/services/types.d.ts', language: 'typescript', content: DEFAULT_TYPES_CODE },
        { name: 'package.json', path: 'package.json', language: 'json', content: DEFAULT_PACKAGE_CODE },
        { name: 'docker-compose.yml', path: 'docker-compose.yml', language: 'yaml', content: DEFAULT_DOCKER_CODE }
      ];
      activeFile = 'src/services/auth-cluster.ts';
    }

    const newRoom = await storage.createRoom({
      roomId,
      name: name.trim(),
      slug: cleanSlug || roomId,
      language: language || 'TypeScript 5.4',
      accessPolicy: accessPolicy || 'invite-only',
      ownerId: user._id || user.id,
      ownerName: user.name,
      activeBranch: 'feat/cluster-sync',
      checkpoint: 'v0.1.0',
      maxCapacity: 10,
      activeFile,
      files: starterFiles,
      participants: [
        {
          userId: user._id || user.id,
          name: user.name,
          avatar: user.avatar || user.name.substring(0, 2).toUpperCase(),
          handle: user.handle || `@${user.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          role: 'host',
          isMuted: false,
          isCameraOff: false,
          isScreenSharing: false,
          isHandRaised: false,
          status: 'Host',
        }
      ]
    });

    return res.status(201).json({
      message: 'Room created successfully.',
      room: newRoom,
    });
  } catch (error) {
    console.error('createRoom error:', error);
    return res.status(500).json({ message: 'Failed to create room.' });
  }
};

export const getRooms = async (req, res) => {
  try {
    const { filter, search } = req.query;
    const userId = req.user ? (req.user._id || req.user.id) : null;
    let rooms = await storage.getAllRooms();

    // Filtering
    if (filter === 'hosted' && userId) {
      rooms = rooms.filter(r => r.ownerId === userId);
    } else if (filter === 'shared' && userId) {
      rooms = rooms.filter(r => r.ownerId !== userId);
    } else if (filter === 'archived') {
      rooms = rooms.filter(r => r.archived);
    } else {
      rooms = rooms.filter(r => !r.archived);
    }

    // Search query
    if (search) {
      const q = search.toLowerCase();
      rooms = rooms.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.roomId.toLowerCase().includes(q) ||
        (r.language && r.language.toLowerCase().includes(q))
      );
    }

    return res.json({ rooms });
  } catch (error) {
    console.error('getRooms error:', error);
    return res.status(500).json({ message: 'Failed to retrieve rooms.' });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await storage.getRoomById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found or invite has expired.' });
    }
    return res.json({ room });
  } catch (error) {
    console.error('getRoomById error:', error);
    return res.status(500).json({ message: 'Failed to retrieve room details.' });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { micMuted, cameraOff } = req.body;
    const user = req.user;

    const room = await storage.getRoomById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found or invite has expired.' });
    }

    // Atomically check 10-peer maximum capacity
    const currentCount = room.participants ? room.participants.length : 0;
    const isAlreadyInRoom = room.participants?.some(p => p.userId === (user._id || user.id));

    if (!isAlreadyInRoom && currentCount >= (room.maxCapacity || 10)) {
      return res.status(403).json({
        message: 'Room has reached maximum capacity of 10 participants. Access denied to prevent sync conflicts.',
        isFull: true,
      });
    }

    // Add or update participant
    let updatedParticipants = room.participants ? [...room.participants] : [];
    if (!isAlreadyInRoom) {
      updatedParticipants.push({
        userId: user._id || user.id,
        name: user.name,
        avatar: user.avatar || user.name.substring(0, 2).toUpperCase(),
        handle: user.handle || `@${user.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        role: updatedParticipants.length === 0 ? 'host' : 'participant',
        isMuted: micMuted ?? false,
        isCameraOff: cameraOff ?? false,
        isScreenSharing: false,
        isHandRaised: false,
        status: 'active',
      });
    }

    const updated = await storage.updateRoom(room.roomId, {
      participants: updatedParticipants,
    });

    return res.json({
      message: 'Joined room successfully.',
      room: updated,
    });
  } catch (error) {
    console.error('joinRoom error:', error);
    return res.status(500).json({ message: 'Failed to join room.' });
  }
};

export const leaveRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const room = await storage.getRoomById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const filtered = (room.participants || []).filter(p => p.userId !== userId);
    const updated = await storage.updateRoom(room.roomId, {
      participants: filtered,
    });

    return res.json({
      message: 'Left room successfully.',
      room: updated,
    });
  } catch (error) {
    console.error('leaveRoom error:', error);
    return res.status(500).json({ message: 'Failed to leave room.' });
  }
};

export const saveRoomFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const { files, activeFile } = req.body;

    const updateData = {};
    if (files) updateData.files = files;
    if (activeFile) updateData.activeFile = activeFile;

    const updated = await storage.updateRoom(id, updateData);
    return res.json({
      message: 'Session files saved successfully.',
      room: updated,
    });
  } catch (error) {
    console.error('saveRoomFiles error:', error);
    return res.status(500).json({ message: 'Failed to save room files.' });
  }
};

export const getSnapshots = async (req, res) => {
  try {
    const { roomId } = req.query;
    const snapshots = await storage.getSnapshots(roomId);
    return res.json({ snapshots });
  } catch (error) {
    console.error('getSnapshots error:', error);
    return res.status(500).json({ message: 'Failed to load snapshots.' });
  }
};

export const createSnapshot = async (req, res) => {
  try {
    const { roomId, versionTag, description, files } = req.body;
    const user = req.user;

    const room = await storage.getRoomById(roomId);
    const snapshotId = `snap-${Math.random().toString(36).substring(2, 9)}`;

    const newSnapshot = await storage.createSnapshot({
      snapshotId,
      roomId,
      roomName: room?.name || roomId,
      versionTag: versionTag || `v2.4.${Math.floor(Math.random() * 90) + 10}`,
      description: description || 'Automatic checkpoint capture',
      authorName: user.name,
      authorId: user._id || user.id,
      branch: room?.activeBranch || 'feat/cluster-sync',
      files: files || room?.files || [],
    });

    return res.status(201).json({
      message: 'Snapshot created successfully.',
      snapshot: newSnapshot,
    });
  } catch (error) {
    console.error('createSnapshot error:', error);
    return res.status(500).json({ message: 'Failed to create snapshot.' });
  }
};

export const restoreSnapshot = async (req, res) => {
  try {
    const { snapshotId } = req.params;
    const allSnapshots = await storage.getSnapshots();
    const snapshot = allSnapshots.find(s => s.snapshotId === snapshotId);

    if (!snapshot) {
      return res.status(404).json({ message: 'Snapshot not found.' });
    }

    const room = await storage.getRoomById(snapshot.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Associated room does not exist.' });
    }

    const updated = await storage.updateRoom(room.roomId, {
      files: snapshot.files,
      checkpoint: snapshot.versionTag,
    });

    return res.json({
      message: `Restored session to ${snapshot.versionTag}`,
      room: updated,
    });
  } catch (error) {
    console.error('restoreSnapshot error:', error);
    return res.status(500).json({ message: 'Failed to restore snapshot.' });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await storage.getChatMessages(roomId);
    return res.json({ messages });
  } catch (error) {
    console.error('getChatHistory error:', error);
    return res.status(500).json({ message: 'Failed to load chat history.' });
  }
};

export const getWhiteboardData = async (req, res) => {
  try {
    const { roomId } = req.params;
    const whiteboard = await storage.getWhiteboard(roomId);
    return res.json({ whiteboard });
  } catch (error) {
    console.error('getWhiteboardData error:', error);
    return res.status(500).json({ message: 'Failed to load whiteboard.' });
  }
};

export const updateWhiteboardData = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { elements, title, viewport } = req.body;
    const whiteboard = await storage.updateWhiteboard(roomId, {
      elements,
      title,
      viewport,
    });
    return res.json({ message: 'Whiteboard saved.', whiteboard });
  } catch (error) {
    console.error('updateWhiteboardData error:', error);
    return res.status(500).json({ message: 'Failed to save whiteboard.' });
  }
};
