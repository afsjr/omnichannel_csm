const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createContainer } = require('./dependencyInjection');
const { initWebSocket } = require('./websocket');
const cors = require('@fastify/cors');
const staticFiles = require('@fastify/static');

async function buildApp(options = {}) {
  const { host = '0.0.0.0', port = 3000 } = options;
  const container = createContainer(options);

  const fastify = require('fastify')({
    logger: options.logger !== false
  });

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

  await fastify.register(cors, {
    origin: allowedOrigins,
    credentials: true
  });

  const frontendDist = process.env.FRONTEND_DIST || path.join(__dirname, '../../frontend/dist');
  if (require('fs').existsSync(frontendDist)) {
    await fastify.register(staticFiles, {
      root: frontendDist,
      prefix: '/',
      wildcard: false
    });

    fastify.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/') || req.url.startsWith('/socket.io/')) {
        return reply.code(404).send({ ok: false, error: 'Not Found' });
      }
      return reply.sendFile('index.html');
    });
  }

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
