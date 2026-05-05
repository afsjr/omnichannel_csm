function registerSocket(io) {
  io.on('connection', (socket) => {
    socket.emit('connected', { ok: true, socketId: socket.id });
  });
}

module.exports = {
  registerSocket
};
