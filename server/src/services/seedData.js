export const DEFAULT_AUTH_CLUSTER_CODE = `import { RedisCluster, ClusterNode } from '@ioredis/cluster';
import { SignJWT, jwtVerify } from 'jose';
import type { SessionClaim, MeshPeer } from '../types';

// Distributed token rate limiter and WebRTC session ticket validator
export class AuthClusterMesh {
  private readonly cluster: RedisCluster;
  private readonly maxSlidingWindowMs: number = 60_000;
  private readonly sharedKeySecret: Uint8Array;

  constructor(nodes: ClusterNode[], rawSecret: string) {
    this.cluster = new RedisCluster(nodes, { enableReadyCheck: true });
    this.sharedKeySecret = new TextEncoder().encode(rawSecret);
  }

  public async verifySessionTicket(ticket: string): Promise<SessionClaim> {
    const { payload } = await jwtVerify(ticket, this.sharedKeySecret, {
      algorithms: ['HS512', 'EdDSA'],
    });
    return payload as unknown as SessionClaim;
  }

  /** Sliding-log throttle per remote client address */
  public async enforceRateLimit(peerIp: string, burstQuota: number): Promise<boolean> {
    const epochNow = Date.now();
    const bucketKey = \`ratelimit:\${peerIp}\`;
    const pipeline = this.cluster.pipeline();
    pipeline.zremrangebyscore(bucketKey, 0, epochNow - this.maxSlidingWindowMs);
    pipeline.zadd(bucketKey, epochNow, \`\${epochNow}-\${Math.random()}\`);
    pipeline.zcard(bucketKey);
    pipeline.expire(bucketKey, Math.ceil(this.maxSlidingWindowMs / 1000));
    
    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) || 0;
    return count <= burstQuota;
  }
}
`;

export const DEFAULT_INDEX_CODE = `import { AuthClusterMesh } from './auth-cluster';

const clusterNodes = [
  { host: '10.0.1.12', port: 6379 },
  { host: '10.0.1.13', port: 6379 },
  { host: '10.0.1.14', port: 6379 }
];

export const meshAuth = new AuthClusterMesh(
  clusterNodes,
  process.env.SESSION_SECRET || 'codetogether_cluster_secret_512'
);

console.log('[AuthMesh] Clustered node ready on port 5000');
`;

export const DEFAULT_TYPES_CODE = `export interface SessionClaim {
  sub: string;
  room: string;
  role: 'host' | 'peer' | 'observer';
  exp: number;
}

export interface MeshPeer {
  id: string;
  name: string;
  avatar: string;
  joinedAt: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}
`;

export const DEFAULT_PRISMA_CODE = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model RoomSession {
  id        String   @id @default(uuid())
  slug      String   @unique
  name      String
  ownerId   String
  createdAt DateTime @default(now())
}
`;

export const DEFAULT_PACKAGE_CODE = `{
  "name": "cluster-mesh-service",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@ioredis/cluster": "^5.3.2",
    "jose": "^5.2.3"
  }
}
`;

export const DEFAULT_DOCKER_CODE = `version: '3.8'
services:
  redis-cluster:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: ["redis-server", "--cluster-enabled", "yes"]
`;

export const DEFAULT_WHITEBOARD_ELEMENTS = [
  {
    id: "node-client",
    type: "box",
    x: 240,
    y: 180,
    width: 200,
    height: 100,
    title: "Next.js 14 WebRTC Client",
    badge: "TS / React",
    subtitle: "Active Peer Mesh: Full P2P RTC",
    color: "#38BDF8",
    fill: "rgba(56, 189, 248, 0.12)"
  },
  {
    id: "node-signaling",
    type: "box",
    x: 520,
    y: 160,
    width: 220,
    height: 120,
    title: "Signaling Server",
    badge: "Node.js / Socket.IO",
    subtitle: "4 pods clustered gateway. Heartbeat: 1,000ms",
    color: "#10B981",
    fill: "rgba(16, 185, 129, 0.12)"
  },
  {
    id: "node-auth",
    type: "diamond",
    x: 560,
    y: 350,
    width: 140,
    height: 90,
    title: "Auth Valid?",
    color: "#F59E0B",
    fill: "rgba(245, 158, 11, 0.12)"
  },
  {
    id: "node-relay",
    type: "box",
    x: 520,
    y: 480,
    width: 220,
    height: 110,
    title: "Coturn Media Relay",
    badge: "STUN / TURN",
    subtitle: "NAT traversal fallback for strict corporate firewalls",
    color: "#06B6D4",
    fill: "rgba(6, 182, 212, 0.12)"
  },
  {
    id: "sticky-boundary",
    type: "sticky",
    x: 260,
    y: 490,
    width: 200,
    height: 130,
    title: "SYSTEM BOUNDARY #01",
    content: "Socket room maximum peer capacity is strictly capped at 10 peers for fully connected mesh topology.\\n— Sarah C.",
    color: "#FDE047",
    textColor: "#1F2937"
  },
  {
    id: "arrow-1",
    type: "arrow",
    startX: 440,
    startY: 230,
    endX: 520,
    endY: 220,
    label: "WSS / Socket.IO",
    color: "#64748B"
  },
  {
    id: "arrow-2",
    type: "arrow",
    startX: 630,
    startY: 280,
    endX: 630,
    endY: 350,
    color: "#F59E0B"
  },
  {
    id: "arrow-3",
    type: "arrow",
    startX: 630,
    startY: 440,
    endX: 630,
    endY: 480,
    label: "NO -> 403",
    color: "#EF4444"
  },
  {
    id: "node-mesh",
    type: "pill",
    x: 760,
    y: 380,
    width: 160,
    height: 40,
    title: "Join Broadcast Mesh",
    badge: "YES -> Grant",
    color: "#10B981"
  }
];

export const INITIAL_ROOMS = [
  {
    roomId: 'arch-review-cluster',
    slug: 'cdt-9921-v34',
    name: 'arch-review-cluster',
    language: 'TypeScript 5.4',
    accessPolicy: 'invite-only',
    ownerId: 'usr_89f02c',
    ownerName: 'Sarah Connor',
    activeBranch: 'feat/cluster-sync',
    checkpoint: 'v0.8.2',
    maxCapacity: 10,
    activeFile: 'src/services/auth-cluster.ts',
    files: [
      { name: 'auth-cluster.ts', path: 'src/services/auth-cluster.ts', language: 'typescript', content: DEFAULT_AUTH_CLUSTER_CODE },
      { name: 'index.ts', path: 'src/services/index.ts', language: 'typescript', content: DEFAULT_INDEX_CODE },
      { name: 'types.d.ts', path: 'src/services/types.d.ts', language: 'typescript', content: DEFAULT_TYPES_CODE },
      { name: 'schema.prisma', path: 'schema.prisma', language: 'prisma', content: DEFAULT_PRISMA_CODE },
      { name: 'package.json', path: 'package.json', language: 'json', content: DEFAULT_PACKAGE_CODE },
      { name: 'docker-compose.yml', path: 'docker-compose.yml', language: 'yaml', content: DEFAULT_DOCKER_CODE }
    ],
    participants: [
      { userId: 'usr_89f02c', name: 'Sarah Connor', avatar: 'SC', handle: '@sarah_c', role: 'host', isMuted: false, isCameraOff: false, isScreenSharing: false, isHandRaised: false, status: 'Host' },
      { userId: 'usr_marcus', name: 'Marcus Vance', avatar: 'MV', handle: '@marcus_v', role: 'participant', isMuted: false, isCameraOff: false, isScreenSharing: false, isHandRaised: false, status: 'active' },
      { userId: 'usr_priya', name: 'Priya Patel', avatar: 'PP', handle: '@priya_p', role: 'participant', isMuted: true, isCameraOff: true, isScreenSharing: false, isHandRaised: false, status: 'Viewing Selection' },
      { userId: 'usr_alex', name: 'Alex Chen', avatar: 'AC', handle: '@alex_c', role: 'participant', isMuted: false, isCameraOff: false, isScreenSharing: true, isHandRaised: false, status: 'Sharing canvas' }
    ]
  },
  {
    roomId: 'payment-gateway-pair',
    slug: 'cdt-4820-pr2',
    name: 'payment-gateway-pair',
    language: 'Go 1.22',
    accessPolicy: 'public',
    ownerId: 'usr_89f02c',
    ownerName: 'Sarah Connor',
    activeBranch: 'fix/stripe-webhook',
    checkpoint: 'v1.1.0',
    maxCapacity: 10,
    activeFile: 'main.go',
    files: [
      { name: 'main.go', path: 'main.go', language: 'go', content: `package main\n\nimport (\n\t"fmt"\n\t"net/http"\n)\n\nfunc main() {\n\tfmt.Println("Payment Gateway Engine v1.22 ready")\n}` }
    ],
    participants: []
  },
  {
    roomId: 'algorithm-whiteboard',
    slug: 'cdt-3199-a8b',
    name: 'algorithm-whiteboard',
    language: 'Python 3.12',
    accessPolicy: 'invite-only',
    ownerId: 'usr_elena',
    ownerName: 'Elena Rostova',
    activeBranch: 'canvas+code',
    checkpoint: 'v0.4.0',
    maxCapacity: 10,
    activeFile: 'solution.py',
    files: [
      { name: 'solution.py', path: 'solution.py', language: 'python', content: `def red_black_tree_insert(root, val):\n    # Re-color and rotate\n    print(f"Inserted {val}")\n    return root\n` }
    ],
    participants: []
  },
  {
    roomId: 'webrtc-signaling-debug',
    slug: 'cdt-7104-q90',
    name: 'webrtc-signaling-debug',
    language: 'Rust 1.78',
    accessPolicy: 'invite-only',
    ownerId: 'usr_89f02c',
    ownerName: 'Sarah Connor',
    activeBranch: 'main',
    checkpoint: 'v0.9.1',
    maxCapacity: 10,
    activeFile: 'src/main.rs',
    files: [
      { name: 'main.rs', path: 'src/main.rs', language: 'rust', content: `fn main() {\n    println!("WebRTC SDP & ICE gateway running on Tokio");\n}` }
    ],
    participants: []
  }
];

export const INITIAL_SNAPSHOTS = [
  {
    snapshotId: 'snap-001',
    roomId: 'arch-review-cluster',
    roomName: 'arch-review-cluster',
    versionTag: 'v2.4.1-rc3_hotfix',
    description: 'Resolved memory leak in WebRTC audio decoder pipeline',
    authorName: 'Sarah Connor',
    authorId: 'usr_89f02c',
    branch: 'feat/cluster-sync',
    createdAt: new Date(Date.now() - 18 * 60 * 1000)
  },
  {
    snapshotId: 'snap-002',
    roomId: 'payment-gateway-pair',
    roomName: 'payment-gateway',
    versionTag: 'stripe_webhook_v1',
    description: 'Signed payload validation middleware in Go',
    authorName: 'Marcus Vance',
    authorId: 'usr_marcus',
    branch: 'fix/stripe-webhook',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    snapshotId: 'snap-003',
    roomId: 'algorithm-whiteboard',
    roomName: 'algorithm-whiteboard',
    versionTag: 'red_black_tree_spec',
    description: 'Completed node re-coloring & rotation proofs',
    authorName: 'Elena Rostova',
    authorId: 'usr_elena',
    branch: 'canvas+code',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  }
];

export const INITIAL_CHAT_MESSAGES = [
  {
    roomId: 'arch-review-cluster',
    senderId: 'usr_priya',
    senderName: 'Priya Patel',
    senderAvatar: 'PP',
    text: 'Check the Redis client pooling logic on L24. We need auto-pipelining enabled for concurrent tickets.',
    createdAt: new Date(Date.now() - 12 * 60 * 1000)
  },
  {
    roomId: 'arch-review-cluster',
    senderId: 'usr_marcus',
    senderName: 'Marcus Vance',
    senderAvatar: 'MV',
    text: 'Merged the token expiry fix. Running benchmark specs now with `npm test`.',
    codeSnippet: {
      code: 'npm test',
      language: 'bash'
    },
    createdAt: new Date(Date.now() - 10 * 60 * 1000)
  },
  {
    roomId: 'arch-review-cluster',
    senderId: 'usr_89f02c',
    senderName: 'Sarah Connor',
    senderAvatar: 'SC',
    text: 'Looking good. I am locking down the sliding window budget to 60k ms.',
    createdAt: new Date(Date.now() - 6 * 60 * 1000)
  }
];
