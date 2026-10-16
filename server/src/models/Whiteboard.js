import mongoose from 'mongoose';

const whiteboardSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    default: 'Cluster Architecture & WebRTC Signaling Flow v2',
  },
  elements: [mongoose.Schema.Types.Mixed],
  viewport: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    zoom: { type: Number, default: 1 },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const Whiteboard = mongoose.model('Whiteboard', whiteboardSchema);
