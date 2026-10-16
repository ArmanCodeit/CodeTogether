import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  senderAvatar: {
    type: String,
    default: '',
  },
  text: {
    type: String,
    required: true,
  },
  codeSnippet: {
    filename: String,
    line: Number,
    code: String,
    language: String,
  },
  reactions: [{
    emoji: String,
    count: { type: Number, default: 0 },
    users: [String],
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
