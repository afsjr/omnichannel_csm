function getIO(req) {
  return req.server?.io;
}

function to(req, channel, event, data) {
  const io = getIO(req);
  if (io) {
    io.to(channel).emit(event, data);
  }
}

function broadcast(req, event, data) {
  const io = getIO(req);
  if (io) {
    io.emit(event, data);
  }
}

function toConversation(req, conversationId, event, data) {
  to(req, `conversation:${conversationId}`, event, data);
}

function toDepartmentQueue(req, event, data) {
  to(req, 'department:queue', event, data);
}

function toDepartment(req, departmentId, event, data) {
  to(req, `department:${departmentId}`, event, data);
}

function toUser(req, userId, event, data) {
  to(req, `user:${userId}`, event, data);
}

module.exports = {
  getIO,
  to,
  broadcast,
  toConversation,
  toDepartmentQueue,
  toDepartment,
  toUser
};
