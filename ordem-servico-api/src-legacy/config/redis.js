const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const STREAM_KEY = process.env.REDIS_STREAM_KEY || 'pittrack:events';
const NOTIFICATIONS_CHANNEL = process.env.REDIS_NOTIFICATIONS_CHANNEL || 'live-notifications';

function createRedisClient(name = 'redis-client') {
  const client = new Redis(REDIS_URL, {
    retryStrategy(times) {
      return Math.min(times * 200, 3000);
    }
  });

  client.on('connect', () => {
    console.log(`[${name}] conectado ao Redis em ${REDIS_URL}`);
  });

  client.on('error', (error) => {
    console.error(`[${name}] erro no Redis:`, error.message);
  });

  return client;
}

module.exports = {
  createRedisClient,
  STREAM_KEY,
  NOTIFICATIONS_CHANNEL
};
