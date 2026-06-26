process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'notification-worker';

const { createRedisClient, NOTIFICATIONS_CHANNEL } = require('../config/redis');
const { startStreamConsumer } = require('../events/consumer');

async function main() {
  const publisher = createRedisClient('notification-pubsub-publisher');

  await startStreamConsumer({
    groupName: 'notification-workers',
    consumerName: process.env.HOSTNAME || 'notification-1',
    async handleEvent(event) {
      const notification = {
        ...event,
        deliveredBy: 'notification-worker',
        deliveredAt: new Date().toISOString()
      };

      await publisher.publish(NOTIFICATIONS_CHANNEL, JSON.stringify(notification));

      console.log(
        `[notification-worker] Pub/Sub ${NOTIFICATIONS_CHANNEL} <- ${event.type} order=${event.orderId || '-'}`
      );
    }
  });
}

main().catch((error) => {
  console.error('[notification-worker] falha fatal:', error);
  process.exit(1);
});
