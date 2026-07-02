const { createRedisClient, STREAM_KEY } = require('../config/redis');

function parseStreamFields(fields) {
  const result = {};

  for (let index = 0; index < fields.length; index += 2) {
    result[fields[index]] = fields[index + 1];
  }

  if (result.payload) {
    try {
      return JSON.parse(result.payload);
    } catch (error) {
      console.error('[stream-consumer] payload inválido:', error.message);
    }
  }

  return {
    type: result.type,
    source: result.source,
    orderId: result.orderId ? Number(result.orderId) : null,
    payload: {},
    timestamp: result.createdAt
  };
}

async function ensureConsumerGroup(redis, groupName) {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, groupName, '0', 'MKSTREAM');
    console.log(`[stream:${STREAM_KEY}] grupo criado: ${groupName}`);
  } catch (error) {
    if (!String(error.message).includes('BUSYGROUP')) {
      throw error;
    }

    console.log(`[stream:${STREAM_KEY}] grupo já existe: ${groupName}`);
  }
}

async function startStreamConsumer({ groupName, consumerName, handleEvent }) {
  const redis = createRedisClient(`${groupName}:${consumerName}`);

  await ensureConsumerGroup(redis, groupName);
  console.log(`[${groupName}] consumidor ativo: ${consumerName}`);

  while (true) {
    const response = await redis.xreadgroup(
      'GROUP',
      groupName,
      consumerName,
      'COUNT',
      10,
      'BLOCK',
      5000,
      'STREAMS',
      STREAM_KEY,
      '>'
    );

    if (!response) {
      continue;
    }

    for (const [, entries] of response) {
      for (const [id, fields] of entries) {
        const event = parseStreamFields(fields);

        try {
          await handleEvent(event, id);
        } catch (error) {
          console.error(`[${groupName}] erro ao processar ${id} ${event.type}:`, error.message);
        } finally {
          await redis.xack(STREAM_KEY, groupName, id);
        }
      }
    }
  }
}

module.exports = {
  startStreamConsumer
};
