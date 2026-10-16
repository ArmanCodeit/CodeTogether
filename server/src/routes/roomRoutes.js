import { Router } from 'express';
import {
  createRoom,
  getRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  saveRoomFiles,
  getSnapshots,
  createSnapshot,
  restoreSnapshot,
  getChatHistory,
  getWhiteboardData,
  updateWhiteboardData,
} from '../controllers/roomController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Routes with optionalAuth (supports both authenticated users and initial demo access)
router.get('/', optionalAuth, getRooms);
router.post('/', optionalAuth, createRoom);
router.get('/snapshots', optionalAuth, getSnapshots);
router.post('/snapshots', optionalAuth, createSnapshot);
router.post('/snapshots/:snapshotId/restore', optionalAuth, restoreSnapshot);

router.get('/:id', optionalAuth, getRoomById);
router.post('/:id/join', optionalAuth, joinRoom);
router.post('/:id/leave', optionalAuth, leaveRoom);
router.put('/:id/files', optionalAuth, saveRoomFiles);
router.get('/:roomId/chat', optionalAuth, getChatHistory);
router.get('/:roomId/whiteboard', optionalAuth, getWhiteboardData);
router.put('/:roomId/whiteboard', optionalAuth, updateWhiteboardData);

export default router;
