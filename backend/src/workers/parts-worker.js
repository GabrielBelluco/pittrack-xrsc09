process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'parts-worker';

const { waitForDatabase } = require('../db');
const ordersService = require('../services/orders.service');
const { EVENT_TYPES } = require('../events/constants');
const { publishEvent } = require('../events/publisher');
const { startStreamConsumer } = require('../events/consumer');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function trackingCode(partId) {
  return `PTK-PECA-${String(partId).padStart(4, '0')}`;
}

async function main() {
  await waitForDatabase();

  await startStreamConsumer({
    groupName: 'parts-workers',
    consumerName: process.env.HOSTNAME || 'parts-1',
    async handleEvent(event) {
      if (event.type !== EVENT_TYPES.PART_RESERVED) {
        return;
      }

      const { partId } = event.payload;
      const orderId = event.orderId;
      const code = trackingCode(partId);

      console.log(`[parts-worker] Reservando peça #${partId} da ordem #${orderId}. Rastreio: ${code}`);

      await ordersService.updatePartStatus(partId, 'Reservada', code);
      await sleep(1500);

      await publishEvent(EVENT_TYPES.PART_TRACKING_UPDATED, {
        orderId,
        partId,
        trackingCode: code,
        message: `Peça #${partId} reservada com rastreio ${code}.`
      });

      console.log(`[parts-worker] Peça #${partId} reservada. Substituição aguardando ação manual da oficina.`);
    }
  });
}

main().catch((error) => {
  console.error('[parts-worker] falha fatal:', error);
  process.exit(1);
});
