import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Room } from '../models/Room.js';
import { Snapshot } from '../models/Snapshot.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { Whiteboard } from '../models/Whiteboard.js';
import { getIsMongoConnected } from '../config/db.js';
import {
  INITIAL_ROOMS,
  INITIAL_SNAPSHOTS,
  INITIAL_CHAT_MESSAGES,
  DEFAULT_WHITEBOARD_ELEMENTS,
} from './seedData.js';

// In-Memory store fallback
const memoryStore = {
  users: [],
  rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
  snapshots: JSON.parse(JSON.stringify(INITIAL_SNAPSHOTS)),
  chatMessages: JSON.parse(JSON.stringify(INITIAL_CHAT_MESSAGES)),
  whiteboards: {
    'arch-review-cluster': {
      roomId: 'arch-review-cluster',
      title: 'Cluster Architecture & WebRTC Signaling Flow v2',
      elements: JSON.parse(JSON.stringify(DEFAULT_WHITEBOARD_ELEMENTS)),
      viewport: { x: 0, y: 0, zoom: 1 },
      updatedAt: new Date(),
    },
  },
};

// Seed default users in memory store
const defaultHashedPassword = await bcrypt.hash('password123', 10);
const defaultUser = {
  _id: 'usr_89f02c',
  id: 'usr_89f02c',
  name: 'Sarah Connor',
  email: 'sarah@codetogether.dev',
  password: defaultHashedPassword,
  avatar: 'SC',
  handle: '@sarah_c',
  role: 'architect',
  recentRooms: [
    { roomId: 'arch-review-cluster', name: 'arch-review-cluster', language: 'TypeScript 5.4' },
    { roomId: 'payment-gateway-pair', name: 'payment-gateway-pair', language: 'Go 1.22' }
  ],
  settings: {
    micMutedByDefault: false,
    cameraOffByDefault: false,
    theme: 'vs-dark',
    fontSize: 14,
    tabSize: 2,
  },
  createdAt: new Date(),
};
memoryStore.users.push(defaultUser);

// Seed MongoDB if empty upon connection
export const initStorage = async () => {
  if (!getIsMongoConnected()) return;

  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create(defaultUser);
      console.log('[Storage] Seeded default user in MongoDB');
    }

    const roomCount = await Room.countDocuments();
    if (roomCount === 0) {
      await Room.insertMany(INITIAL_ROOMS);
      console.log('[Storage] Seeded initial rooms in MongoDB');
    }

    const snapshotCount = await Snapshot.countDocuments();
    if (snapshotCount === 0) {
      await Snapshot.insertMany(INITIAL_SNAPSHOTS);
      console.log('[Storage] Seeded initial snapshots in MongoDB');
    }

    const chatCount = await ChatMessage.countDocuments();
    if (chatCount === 0) {
      await ChatMessage.insertMany(INITIAL_CHAT_MESSAGES);
      console.log('[Storage] Seeded initial chat messages in MongoDB');
    }

    const whiteboardCount = await Whiteboard.countDocuments();
    if (whiteboardCount === 0) {
      await Whiteboard.create({
        roomId: 'arch-review-cluster',
        title: 'Cluster Architecture & WebRTC Signaling Flow v2',
        elements: DEFAULT_WHITEBOARD_ELEMENTS,
        viewport: { x: 0, y: 0, zoom: 1 },
      });
      console.log('[Storage] Seeded initial whiteboard in MongoDB');
    }
  } catch (err) {
    console.warn('[Storage] Seed MongoDB warning:', err.message);
  }
};

export const storage = {
  // Users
  async findUserByEmail(email) {
    if (getIsMongoConnected()) {
      return await User.findOne({ email: email.toLowerCase() });
    }
    return memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id) {
    if (getIsMongoConnected()) {
      return await User.findById(id).select('-password');
    }
    const u = memoryStore.users.find(user => (user._id === id || user.id === id));
    if (!u) return null;
    const { password, ...safeUser } = u;
    return safeUser;
  },

  async createUser(userData) {
    if (getIsMongoConnected()) {
      return await User.create(userData);
    }
    const newUser = {
      _id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      ...userData,
      createdAt: new Date(),
    };
    newUser.id = newUser._id;
    memoryStore.users.push(newUser);
    return newUser;
  },

  async updateUser(id, updateData) {
    if (getIsMongoConnected()) {
      return await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    }
    const idx = memoryStore.users.findIndex(u => u._id === id || u.id === id);
    if (idx === -1) return null;
    memoryStore.users[idx] = { ...memoryStore.users[idx], ...updateData };
    const { password, ...safe } = memoryStore.users[idx];
    return safe;
  },

  // Rooms
  async getAllRooms() {
    if (getIsMongoConnected()) {
      return await Room.find().sort({ updatedAt: -1 });
    }
    return memoryStore.rooms;
  },

  async getRoomById(roomId) {
    if (getIsMongoConnected()) {
      return await Room.findOne({ roomId });
    }
    return memoryStore.rooms.find(r => r.roomId === roomId || r.slug === roomId) || null;
  },

  async createRoom(roomData) {
    if (getIsMongoConnected()) {
      return await Room.create(roomData);
    }
    const newRoom = {
      ...roomData,
      participants: roomData.participants || [],
      files: roomData.files || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.rooms.push(newRoom);
    return newRoom;
  },

  async updateRoom(roomId, updateData) {
    if (getIsMongoConnected()) {
      return await Room.findOneAndUpdate({ roomId }, { ...updateData, updatedAt: new Date() }, { new: true });
    }
    const idx = memoryStore.rooms.findIndex(r => r.roomId === roomId || r.slug === roomId);
    if (idx === -1) return null;
    memoryStore.rooms[idx] = { ...memoryStore.rooms[idx], ...updateData, updatedAt: new Date() };
    return memoryStore.rooms[idx];
  },

  async deleteRoom(roomId) {
    if (getIsMongoConnected()) {
      return await Room.findOneAndDelete({ roomId });
    }
    const idx = memoryStore.rooms.findIndex(r => r.roomId === roomId || r.slug === roomId);
    if (idx !== -1) {
      memoryStore.rooms.splice(idx, 1);
      return true;
    }
    return false;
  },

  // Files
  async updateRoomFile(roomId, filePath, content) {
    if (getIsMongoConnected()) {
      const room = await Room.findOne({ roomId });
      if (!room) return null;
      const file = room.files.find(f => f.path === filePath);
      if (file) {
        file.content = content;
      } else {
        const name = filePath.split('/').pop() || filePath;
        room.files.push({ name, path: filePath, content });
      }
      room.updatedAt = new Date();
      await room.save();
      return room;
    }
    const room = memoryStore.rooms.find(r => r.roomId === roomId || r.slug === roomId);
    if (!room) return null;
    const file = room.files.find(f => f.path === filePath);
    if (file) {
      file.content = content;
    } else {
      const name = filePath.split('/').pop() || filePath;
      room.files.push({ name, path: filePath, content });
    }
    room.updatedAt = new Date();
    return room;
  },

  // Snapshots
  async getSnapshots(roomId) {
    if (getIsMongoConnected()) {
      const query = roomId ? { roomId } : {};
      return await Snapshot.find(query).sort({ createdAt: -1 });
    }
    if (roomId) {
      return memoryStore.snapshots.filter(s => s.roomId === roomId);
    }
    return memoryStore.snapshots;
  },

  async createSnapshot(snapshotData) {
    if (getIsMongoConnected()) {
      return await Snapshot.create(snapshotData);
    }
    const newSnapshot = {
      ...snapshotData,
      createdAt: new Date(),
    };
    memoryStore.snapshots.unshift(newSnapshot);
    return newSnapshot;
  },

  // Chat Messages
  async getChatMessages(roomId) {
    if (getIsMongoConnected()) {
      return await ChatMessage.find({ roomId }).sort({ createdAt: 1 }).limit(100);
    }
    return memoryStore.chatMessages.filter(m => m.roomId === roomId);
  },

  async createChatMessage(msgData) {
    if (getIsMongoConnected()) {
      return await ChatMessage.create(msgData);
    }
    const newMsg = {
      ...msgData,
      createdAt: new Date(),
    };
    memoryStore.chatMessages.push(newMsg);
    return newMsg;
  },

  // Whiteboard
  async getWhiteboard(roomId) {
    if (getIsMongoConnected()) {
      let wb = await Whiteboard.findOne({ roomId });
      if (!wb) {
        wb = await Whiteboard.create({
          roomId,
          title: 'Cluster Architecture & WebRTC Signaling Flow v2',
          elements: DEFAULT_WHITEBOARD_ELEMENTS,
          viewport: { x: 0, y: 0, zoom: 1 },
        });
      }
      return wb;
    }
    if (!memoryStore.whiteboards[roomId]) {
      memoryStore.whiteboards[roomId] = {
        roomId,
        title: 'Cluster Architecture & WebRTC Signaling Flow v2',
        elements: JSON.parse(JSON.stringify(DEFAULT_WHITEBOARD_ELEMENTS)),
        viewport: { x: 0, y: 0, zoom: 1 },
        updatedAt: new Date(),
      };
    }
    return memoryStore.whiteboards[roomId];
  },

  async updateWhiteboard(roomId, data) {
    if (getIsMongoConnected()) {
      return await Whiteboard.findOneAndUpdate(
        { roomId },
        { ...data, updatedAt: new Date() },
        { new: true, upsert: true }
      );
    }
    memoryStore.whiteboards[roomId] = {
      ...(memoryStore.whiteboards[roomId] || { roomId }),
      ...data,
      updatedAt: new Date(),
    };
    return memoryStore.whiteboards[roomId];
  },
};
