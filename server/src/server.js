import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { initStorage } from './services/storage.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import { setupSocketHandlers } from './socket/socketHandler.js';
import { executeCode } from './controllers/executionController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

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
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.post('/api/execute', executeCode);

// Socket.IO event listener setup
setupSocketHandlers(io);

// Serve static frontend bundle in production if built
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Connect DB and Start Server
const startServer = async () => {
  await connectDB();
  await initStorage();

  server.listen(PORT, () => {
    console.log(`[CodeTogether] Server running on port ${PORT}`);
    console.log(`[CodeTogether] API endpoint: http://localhost:${PORT}/api`);
    console.log(`[CodeTogether] Signaling endpoint: ws://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
