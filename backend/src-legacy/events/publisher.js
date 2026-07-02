const { createRedisClient, STREAM_KEY } = require('../config/redis');

const redis = createRedisClient(process.env.SERVICE_NAME || 'event-publisher');

async function publishEvent(type, payload = {}, source = process.env.SERVICE_NAME || 'api') {
  const event = {
    type,
    source,
    orderId: payload.orderId ? Number(payload.orderId) : null,
    payload,
    message: payload.message || type,
    timestamp: new Date().toISOString()
  };

  const id = await redis.xadd(
    STREAM_KEY,
    '*',
    'type',
    event.type,
    'source',
    event.source,
    'orderId',
    event.orderId ? String(event.orderId) : '',
    'payload',
    JSON.stringify(event),
    'createdAt',
    event.timestamp
  );

  console.log(
    `[stream:${STREAM_KEY}] XADD ${id} ${event.type} order=${event.orderId || '-'} source=${event.source}`
  );

  return {
    id,
    ...event
  };
}

module.exports = {
  publishEvent
};
