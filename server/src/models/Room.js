import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  language: { type: String, default: 'typescript' },
  content: { type: String, default: '' },
  isFolder: { type: Boolean, default: false },
});

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String, default: '' },
  handle: { type: String, default: '' },
  socketId: { type: String, default: '' },
  role: { type: String, enum: ['host', 'participant', 'viewer'], default: 'participant' },
  isMuted: { type: Boolean, default: false },
  isCameraOff: { type: Boolean, default: false },
  isScreenSharing: { type: Boolean, default: false },
  isHandRaised: { type: Boolean, default: false },
  status: { type: String, default: 'active' }, // active, viewing selection, sharing canvas, standby, etc.
  joinedAt: { type: Date, default: Date.now },
});

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    trim: true,
  },
  language: {
    type: String,
    default: 'TypeScript (Node.js 20)',
  },
  accessPolicy: {
    type: String,
    enum: ['invite-only', 'public'],
    default: 'invite-only',
  },
  ownerId: {
    type: String,
    required: true,
  },
  ownerName: {
    type: String,
    default: 'Sarah Connor',
  },
  activeBranch: {
    type: String,
    default: 'feat/cluster-sync',
  },
  checkpoint: {
    type: String,
    default: 'v0.8.2',
  },
  maxCapacity: {
    type: Number,
    default: 10,
  },
  participants: [participantSchema],
  files: [fileSchema],
  activeFile: {
    type: String,
    default: 'src/services/auth-cluster.ts',
  },
  whiteboardData: {
    type: mongoose.Schema.Types.Mixed,
    default: { elements: [] },
  },
  archived: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const Room = mongoose.model('Room', roomSchema);
