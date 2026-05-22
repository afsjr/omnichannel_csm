async function initWebSocket(fastify, container) {
  const { Server } = require('socket.io');
  const authService = container.services.auth;
  const io = new Server(fastify.server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Token não fornecido'));
    }
    const user = authService.verifyToken(token);
    if (!user) {
      return next(new Error('Token inválido ou expirado'));
    }
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    socket.emit('connected', { ok: true, socketId: socket.id, user: { id: socket.user.id, role: socket.user.role } });

    socket.on('join:department', (departmentId) => {
      socket.join(`department:${departmentId || 'unassigned'}`);
    });

    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on('join:conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave:department', (departmentId) => {
      socket.leave(`department:${departmentId || 'unassigned'}`);
    });

    socket.on('leave:conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });
  });

  fastify.decorate('io', io);
  return io;
}

module.exports = { initWebSocket };