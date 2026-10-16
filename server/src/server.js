import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initStorage } from './services/storage.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import { setupSocketHandlers } from './socket/socketHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 15000,
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'CodeTogether API Gateway',
    version: '2.4.0',
    clusterNode: 'US-EAST-1D ACTIVE',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Socket.IO event listener setup
setupSocketHandlers(io);

// Connect DB and Start Server
const startServer = async () => {
  await connectDB();
  await initStorage();

  server.listen(PORT, () => {
    console.log(`[CodeTogether v2.4] Server running on port ${PORT}`);
    console.log(`[CodeTogether v2.4] REST API: http://localhost:${PORT}/api`);
    console.log(`[CodeTogether v2.4] Signaling Server: ws://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
