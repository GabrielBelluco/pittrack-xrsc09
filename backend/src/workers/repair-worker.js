process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'repair-worker';

const { waitForDatabase } = require('../db');
const { EVENT_TYPES } = require('../events/constants');
const { startStreamConsumer } = require('../events/consumer');

async function main() {
  await waitForDatabase();

  await startStreamConsumer({
    groupName: 'repair-workers',
    consumerName: process.env.HOSTNAME || 'repair-1',
    async handleEvent(event) {
      if (event.type !== EVENT_TYPES.BUDGET_APPROVED) {
        return;
      }

      const orderId = event.orderId;
      console.log(
        `[repair-worker] Orçamento aprovado para ordem #${orderId}. Reparo liberado, aguardando início manual.`
      );
    }
  });
}

main().catch((error) => {
  console.error('[repair-worker] falha fatal:', error);
  process.exit(1);
});
