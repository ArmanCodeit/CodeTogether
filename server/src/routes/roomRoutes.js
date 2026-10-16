import { Router } from 'express';
import {
  createRoom,
  getRooms,
  getRoomById,
  deleteRoom,
  joinRoom,
  leaveRoom,
  saveRoomFiles,
  getWhiteboardData,
  updateWhiteboardData,
} from '../controllers/roomController.js';
import { executeCode } from '../controllers/executionController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getRooms);
router.post('/', optionalAuth, createRoom);
router.post('/execute', executeCode);
router.get('/:id', optionalAuth, getRoomById);
router.delete('/:id', optionalAuth, deleteRoom);
router.post('/:id/join', optionalAuth, joinRoom);
router.post('/:id/leave', optionalAuth, leaveRoom);
router.put('/:id/files', optionalAuth, saveRoomFiles);
router.get('/:roomId/whiteboard', optionalAuth, getWhiteboardData);
router.put('/:roomId/whiteboard', optionalAuth, updateWhiteboardData);

export default router;
