import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema({
  snapshotId: {
    type: String,
    required: true,
    unique: true,
  },
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  roomName: {
    type: String,
    default: '',
  },
  versionTag: {
    type: String,
    required: true, // e.g. v2.4.1-rc3_hotfix
  },
  description: {
    type: String,
    default: '',
  },
  authorName: {
    type: String,
    default: 'Sarah Connor',
  },
  authorId: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    default: 'feat/cluster-sync',
  },
  files: [{
    name: String,
    path: String,
    language: String,
    content: String,
  }],
  whiteboardData: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Snapshot = mongoose.model('Snapshot', snapshotSchema);
