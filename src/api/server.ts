import fastify from 'fastify';
import { config } from '../config/env';
import { logger } from '../core/logger';
import { db } from '../core/database/couchbase';
import { apiRoutes } from './routes/routes';

const server = fastify({
  logger: logger as any
});

server.register(apiRoutes);

export const app = server;

export const start = async () => {
  try {
    await db.connect();
    // Only listen if not in test mode, or let the test handle listening?
    // Actually, for robust testing, we want to start the server.
    // But if imported, we might not want to start immediately.
    
    if (require.main === module) {
        await server.listen({ port: config.PORT, host: '0.0.0.0' });
        logger.info(`Server running at http://0.0.0.0:${config.PORT}`);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
    start();
}
