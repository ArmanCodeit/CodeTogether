# CodeTogether v2.4 — Live Mesh Developer Workspace

An enterprise-grade, real-time collaborative coding and architecture workspace with Monaco Editor, WebRTC audio/video mesh, interactive HTML5 canvas doodle board, and MongoDB version history persistence.

---

## 🌟 Key Features

1. **Exact UI Preservation**:
   - Pixel-perfect reproduction of provided IDE, Dashboard, Active Calls, and Architecture Canvas designs.
   - Dark developer aesthetic (`#0A0D14`), high-contrast typography (`JetBrains Mono` and `Plus Jakarta Sans`), sleek glowing accents, and reactive feedback.

2. **Full Authentication System**:
   - User registration and login with bcrypt password hashing.
   - JWT authentication persistence across reloads.
   - Profile and workspace account settings.
   - Out-of-the-box demo credentials (`sarah@codetogether.dev` / `password123`) with 1-click test button.

3. **Dashboard & Room Management**:
   - Create new coding rooms with customizable language servers (TypeScript, JavaScript, Python, Go, Rust).
   - Join existing rooms via room slug or invite link.
   - Pre-flight device state toggles (join with microphone muted / camera off).
   - Filter rooms by `All Rooms`, `My Hosted`, `Shared With Me`, and `Archived`.
   - **Atomic 10-Peer Capacity Gatekeeper**: Strictly rejects the 11th participant on the server side to protect WebRTC mesh bitrate and prevent CRDT sync conflicts.

4. **Real-Time Collaborative Code Editor**:
   - Monaco Editor with syntax highlighting, line numbers, and multi-file tabs.
   - Live synchronization over Socket.IO (instant keystroke reflection across multiple browser windows).
   - Remote collaborator cursor presence (e.g. Priya Patel marker).
   - File tree management (create, switch, delete files).
   - In-editor test runner simulation and live streaming console drawer (`Console`, `Test Runner`, `Socket.IO Events`, `Problems`).

5. **Live WebRTC Audio/Video Calls**:
   - Fully connected WebRTC peer mesh with STUN/TURN signaling.
   - Microphone, camera, and screen sharing toggles with real device access (`getUserMedia` / `getDisplayMedia`).
   - Seamless switching between compact editor sidebar tiles, draggable Picture-in-Picture (PIP) Huddle, and full-screen 10-participant Active Calls grid.
   - Active speaker detection glowing halos and camera-off audio avatars.

6. **Shared Doodle Board / Architecture Canvas**:
   - HTML5 Canvas with pointer events.
   - Freehand pen, arrow, rectangle, circle, decision diamond, text, and sticky notes.
   - Color palette, stroke weights, undo/redo, clear canvas with confirmation, and PNG export.
   - Infinite pan & zoom (`Hold Space + Drag to Pan`).
   - Real-time whiteboard state synchronization and MongoDB persistence.

7. **Room Chat & Version Snapshots**:
   - Instant room chat stream (`#CLUSTER-SYNC-STREAM`) with code snippets, copy actions, and emoji reactions.
   - Snapshot checkpoint system: automatic time-machine commits with 1-click `Restore`.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** >= v18.0.0 (Tested on Node v20.19.5)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` (Automatic in-memory storage fallback is also included if MongoDB is not running).

### Installation

From the project root:
```bash
# 1. Install root dependencies
npm install

# 2. Install server dependencies
cd server
npm install

# 3. Install client dependencies
cd ../client
npm install
```

### Running Locally

You can run both backend and frontend concurrently:
```bash
# From workspace root:
npm run dev
```

Or run them in separate terminals:
```bash
# Terminal 1 (Backend API & Socket.IO Signaling Server):
cd server
node src/server.js
# Runs on http://localhost:5000

# Terminal 2 (Client Vite Dev Server):
cd client
npm run dev
# Runs on http://localhost:5173
```

Open your browser to:
```
http://localhost:5173/
```

---

## ⚙️ Environment Variables

### `server/.env`
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/codetogether
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## 🔒 Security & Reliability

- **Strict Server-Side Atomic Capacity**: Enforces `maxCapacity: 10` on the Socket.IO gateway and REST join endpoint.
- **Password Protection**: Passwords salted and hashed with bcrypt (10 rounds).
- **Graceful Persistence Fallback**: If local MongoDB service is restarted or unreachable, the unified storage layer automatically falls back to in-memory state so tests and pairing sessions never drop.
- **WebRTC DTLS/SRTP**: End-to-end encrypted peer data mesh.
