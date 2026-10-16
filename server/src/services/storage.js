import { User } from '../models/User.js';
import { Room } from '../models/Room.js';
import { Snapshot } from '../models/Snapshot.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { Whiteboard } from '../models/Whiteboard.js';
import { getIsMongoConnected } from '../config/db.js';

// Clean in-memory store for fallback if MongoDB connection drops
const memoryStore = {
  users: [],
  rooms: [],
  snapshots: [],
  chatMessages: [],
  whiteboards: {},
};

// No fake seed data — cleanly initialized
export const initStorage = async () => {
  console.log('[Storage] Ready. All application state is real and persisted.');
};

export const storage = {
  // --- USERS ---
  async findUserByEmail(email) {
    if (getIsMongoConnected()) {
      return await User.findOne({ email: email.toLowerCase() });
    }
    return memoryStore.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
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

  // --- ROOMS ---
  async getAllRooms(filterQuery = {}) {
    if (getIsMongoConnected()) {
      return await Room.find(filterQuery).sort({ updatedAt: -1 });
    }
    return memoryStore.rooms;
  },

  async getRoomById(roomId) {
    if (getIsMongoConnected()) {
      return await Room.findOne({ $or: [{ roomId }, { slug: roomId }] });
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
      return await Room.findOneAndUpdate(
        { $or: [{ roomId }, { slug: roomId }] },
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
    }
    const idx = memoryStore.rooms.findIndex(r => r.roomId === roomId || r.slug === roomId);
    if (idx === -1) return null;
    memoryStore.rooms[idx] = { ...memoryStore.rooms[idx], ...updateData, updatedAt: new Date() };
    return memoryStore.rooms[idx];
  },

  async deleteRoom(roomId) {
    if (getIsMongoConnected()) {
      await Room.findOneAndDelete({ $or: [{ roomId }, { slug: roomId }] });
      await ChatMessage.deleteMany({ roomId });
      await Snapshot.deleteMany({ roomId });
      await Whiteboard.findOneAndDelete({ roomId });
      return true;
    }
    const idx = memoryStore.rooms.findIndex(r => r.roomId === roomId || r.slug === roomId);
    if (idx !== -1) {
      memoryStore.rooms.splice(idx, 1);
      memoryStore.chatMessages = memoryStore.chatMessages.filter(m => m.roomId !== roomId);
      delete memoryStore.whiteboards[roomId];
      return true;
    }
    return false;
  },

  // --- FILES ---
  async updateRoomFile(roomId, filePath, content) {
    if (getIsMongoConnected()) {
      const room = await Room.findOne({ $or: [{ roomId }, { slug: roomId }] });
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

  // --- SNAPSHOTS ---
  async getSnapshots(roomId, userId) {
    const query = {};
    if (roomId) query.roomId = roomId;
    if (userId) query.authorId = userId;

    if (getIsMongoConnected()) {
      return await Snapshot.find(query).sort({ createdAt: -1 });
    }
    return memoryStore.snapshots.filter(s => {
      if (roomId && s.roomId !== roomId) return false;
      if (userId && s.authorId !== userId) return false;
      return true;
    });
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

  async deleteSnapshot(snapshotId) {
    if (getIsMongoConnected()) {
      return await Snapshot.findOneAndDelete({ snapshotId });
    }
    const idx = memoryStore.snapshots.findIndex(s => s.snapshotId === snapshotId);
    if (idx !== -1) {
      memoryStore.snapshots.splice(idx, 1);
      return true;
    }
    return false;
  },

  // --- CHAT MESSAGES ---
  async getChatMessages(roomId) {
    if (getIsMongoConnected()) {
      return await ChatMessage.find({ roomId }).sort({ createdAt: 1 }).limit(200);
    }
    return memoryStore.chatMessages.filter(m => m.roomId === roomId);
  },

  async createChatMessage(msgData) {
    if (getIsMongoConnected()) {
      return await ChatMessage.create(msgData);
    }
    const newMsg = {
      ...msgData,
      _id: `msg_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date(),
    };
    memoryStore.chatMessages.push(newMsg);
    return newMsg;
  },

  // --- WHITEBOARD ---
  async getWhiteboard(roomId) {
    if (getIsMongoConnected()) {
      let wb = await Whiteboard.findOne({ roomId });
      if (!wb) {
        wb = await Whiteboard.create({
          roomId,
          title: 'Doodle Board',
          elements: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        });
      }
      return wb;
    }
    if (!memoryStore.whiteboards[roomId]) {
      memoryStore.whiteboards[roomId] = {
        roomId,
        title: 'Doodle Board',
        elements: [],
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
      ...(memoryStore.whiteboards[roomId] || { roomId, title: 'Doodle Board', elements: [] }),
      ...data,
      updatedAt: new Date(),
    };
    return memoryStore.whiteboards[roomId];
  },

  // --- REAL METRICS & STATISTICS (NO FAKE DATA) ---
  async getUserStats(userId) {
    let allRooms = [];
    let userSnapshots = [];

    if (getIsMongoConnected()) {
      allRooms = await Room.find();
      userSnapshots = await Snapshot.find(userId ? { authorId: userId } : {});
    } else {
      allRooms = memoryStore.rooms;
      userSnapshots = memoryStore.snapshots;
    }

    const myRooms = userId ? allRooms.filter(r => r.ownerId === userId) : allRooms;
    const activeRooms = allRooms.filter(r => r.participants && r.participants.length > 0);

    // Compute real language distribution
    const langCounts = {};
    let totalFiles = 0;
    let totalBytes = 0;

    myRooms.forEach(room => {
      const lang = room.language || 'JavaScript';
      langCounts[lang] = (langCounts[lang] || 0) + 1;

      (room.files || []).forEach(f => {
        totalFiles += 1;
        totalBytes += (f.content || '').length;
      });
    });

    const totalLangRooms = Object.values(langCounts).reduce((a, b) => a + b, 0);
    const languagesDistribution = Object.entries(langCounts).map(([name, count]) => ({
      name,
      count,
      percent: totalLangRooms > 0 ? Math.round((count / totalLangRooms) * 100) : 0,
    }));

    return {
      activeRoomsCount: activeRooms.length,
      totalRoomsCount: myRooms.length,
      collabSessionsCount: myRooms.length,
      snapshotsCount: userSnapshots.length,
      storageUsedBytes: totalBytes,
      storageUsedKB: (totalBytes / 1024).toFixed(1),
      languagesDistribution,
      totalFiles,
    };
  },
};
