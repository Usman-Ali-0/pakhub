import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '../config';
import { verifyAccessToken } from '../services/auth.service';

let io: SocketIOServer;

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));

      const user = await verifyAccessToken(token);
      if (!user) return next(new Error('Invalid token'));

      (socket as any).userId = user.id;
      (socket as any).username = user.username;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`🔌 User connected: ${(socket as any).username} (${socket.id})`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    socket.on('join:repo', (repoId: string) => {
      socket.join(`repo:${repoId}`);
    });

    socket.on('leave:repo', (repoId: string) => {
      socket.leave(`repo:${repoId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${(socket as any).username}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

// Emit notification to a specific user
export function emitToUser(userId: string, event: string, data: unknown) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

// Emit to everyone in a repo room
export function emitToRepo(repoId: string, event: string, data: unknown) {
  if (io) io.to(`repo:${repoId}`).emit(event, data);
}
