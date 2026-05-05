const fastify = require('fastify')({ logger: true });
const http = require('http');
const { Server } = require('socket.io');
const routes = require('./routes');
const { registerSocket } = require('./websocket');

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: '*' }
});

fastify.decorate('io', io);

fastify.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    reply.code(204).send();
  }
});

fastify.register(routes);

server.on('request', fastify.server);
registerSocket(io);

const PORT = Number(process.env.PORT || 3000);

server.listen(PORT, '0.0.0.0', () => {
  fastify.log.info(`Servidor rodando na porta ${PORT}`);
});
