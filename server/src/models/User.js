import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => 'usr_' + Math.random().toString(36).substring(2, 9),
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  handle: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['developer', 'lead', 'architect', 'admin'],
    default: 'developer',
  },
  recentRooms: [{
    roomId: String,
    name: String,
    language: String,
    lastVisited: { type: Date, default: Date.now },
  }],
  settings: {
    micMutedByDefault: { type: Boolean, default: false },
    cameraOffByDefault: { type: Boolean, default: false },
    theme: { type: String, default: 'vs-dark' },
    fontSize: { type: Number, default: 14 },
    tabSize: { type: Number, default: 2 },
  },
  resetToken: String,
  resetTokenExpiry: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.model('User', userSchema);
