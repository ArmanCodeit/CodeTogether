import { storage } from '../services/storage.js';
import { getStarterFilesForLanguage, getLanguageConfig } from '../services/languageTemplates.js';

export const createRoom = async (req, res) => {
  try {
    const { name, language, creatorName, userId: customUserId } = req.body;
    const roomDisplayName = (name && name.trim()) || 'Collaboration Session';
    const cleanSlug = roomDisplayName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const roomId = `cdt-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
    const displayName = (creatorName && creatorName.trim()) || req.user?.name || 'Developer';
    const userId = customUserId || (req.user ? (req.user._id || req.user.id) : `usr_${Math.random().toString(36).substring(2, 8)}`);

    const user = {
      _id: userId,
      id: userId,
      name: displayName,
      avatar: displayName.substring(0, 2).toUpperCase(),
    };

    const starterFiles = getStarterFilesForLanguage(language || 'javascript');
    const activeFile = starterFiles[0]?.path || 'index.js';
    const langConfig = getLanguageConfig(language || 'javascript');

    const newRoom = await storage.createRoom({
      roomId,
      name: roomDisplayName,
      slug: cleanSlug || roomId,
      language: langConfig.name,
      ownerId: user.id,
      ownerName: user.name,
      maxCapacity: 10,
      activeFile,
      files: starterFiles,
      participants: [
        {
          userId: user.id,
          name: user.name,
          avatar: user.avatar,
          role: 'host',
          isMuted: false,
          isCameraOff: false,
          isScreenSharing: false,
        },
      ],
    });

    return res.status(201).json({
      message: 'Room created successfully.',
      room: newRoom,
      creator: user,
    });
  } catch (error) {
    console.error('createRoom error:', error);
    return res.status(500).json({ message: 'Failed to create room.' });
  }
};

export const getRooms = async (req, res) => {
  try {
    const rooms = await storage.getAllRooms();
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

export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteRoom(id);
    if (success) {
      return res.json({ message: 'Room deleted successfully.' });
    }
    return res.status(404).json({ message: 'Room not found.' });
  } catch (error) {
    console.error('deleteRoom error:', error);
    return res.status(500).json({ message: 'Failed to delete room.' });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, userId: customUserId, micMuted, cameraOff } = req.body;

    const room = await storage.getRoomById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room does not exist.' });
    }

    const name = (displayName && displayName.trim()) || req.user?.name || 'Guest User';
    const userId = customUserId || (req.user ? (req.user._id || req.user.id) : `usr_${Math.random().toString(36).substring(2, 8)}`);

    const currentCount = room.participants ? room.participants.length : 0;
    const isAlreadyInRoom = room.participants?.some(p => p.userId === userId);

    // Enforce 10 participant capacity
    if (!isAlreadyInRoom && currentCount >= (room.maxCapacity || 10)) {
      return res.status(403).json({
        message: 'Room is full (maximum 10 participants reached).',
        isFull: true,
      });
    }

    let updatedParticipants = room.participants ? [...room.participants] : [];
    if (!isAlreadyInRoom) {
      updatedParticipants.push({
        userId,
        name,
        avatar: name.substring(0, 2).toUpperCase(),
        role: updatedParticipants.length === 0 ? 'host' : 'participant',
        isMuted: micMuted ?? false,
        isCameraOff: cameraOff ?? false,
        isScreenSharing: false,
      });
    }

    const updated = await storage.updateRoom(room.roomId, {
      participants: updatedParticipants,
    });

    return res.json({
      message: 'Joined room successfully.',
      room: updated,
      user: {
        id: userId,
        _id: userId,
        name,
        avatar: name.substring(0, 2).toUpperCase(),
      },
    });
  } catch (error) {
    console.error('joinRoom error:', error);
    return res.status(500).json({ message: 'Failed to join room.' });
  }
};

export const leaveRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body?.userId || req.user?._id || req.user?.id;

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
    const { files, activeFile, language } = req.body;

    const updateData = {};
    if (files) updateData.files = files;
    if (activeFile) updateData.activeFile = activeFile;
    if (language) updateData.language = language;

    const updated = await storage.updateRoom(id, updateData);
    return res.json({
      message: 'Files saved successfully.',
      room: updated,
    });
  } catch (error) {
    console.error('saveRoomFiles error:', error);
    return res.status(500).json({ message: 'Failed to save room files.' });
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
    const { elements, viewport } = req.body;
    const whiteboard = await storage.updateWhiteboard(roomId, {
      elements: elements || [],
      viewport: viewport || { x: 0, y: 0, zoom: 1 },
    });
    return res.json({ message: 'Whiteboard saved.', whiteboard });
  } catch (error) {
    console.error('updateWhiteboardData error:', error);
    return res.status(500).json({ message: 'Failed to save whiteboard.' });
  }
};
