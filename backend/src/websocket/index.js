async function initWebSocket(fastify, container) {
  const { Server } = require('socket.io');
  const io = new Server(fastify.server, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket) => {
    socket.emit('connected', { ok: true, socketId: socket.id });

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