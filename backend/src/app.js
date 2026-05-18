require('dotenv').config();

const { createContainer } = require('./dependencyInjection');
const { initWebSocket } = require('./websocket');
const cors = require('@fastify/cors');

async function buildApp(options = {}) {
  const { host = '0.0.0.0', port = 3000 } = options;
  const container = createContainer(options);

  const fastify = require('fastify')({
    logger: options.logger !== false
  });

  await fastify.register(cors, {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  });

  fastify.decorate('container', container);
  fastify.decorate('db', container.db);

  fastify.register(require('./routes'), { prefix: '/api' });

  await initWebSocket(fastify, container);

  return { fastify, container, host, port };
}

async function start() {
  const { fastify, container, host, port } = await buildApp();

  try {
    await fastify.listen({ host, port });
    console.log(`Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    await container.close();
    process.exit(1);
  }

  const shutdown = async () => {
    console.log('Shutting down...');
    await fastify.close();
    await container.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { buildApp, start };

if (require.main === module) {
  start();
}