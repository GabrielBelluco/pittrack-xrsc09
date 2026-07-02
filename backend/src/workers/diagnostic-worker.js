process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'diagnostic-worker';

const { waitForDatabase } = require('../db');
const { EVENT_TYPES } = require('../events/constants');
const { startStreamConsumer } = require('../events/consumer');

async function main() {
  await waitForDatabase();

  await startStreamConsumer({
    groupName: 'diagnostic-workers',
    consumerName: process.env.HOSTNAME || 'diagnostic-1',
    async handleEvent(event) {
      if (event.type !== EVENT_TYPES.SERVICE_ORDER_CREATED) {
        return;
      }

      const orderId = event.orderId;
      console.log(
        `[diagnostic-worker] Ordem #${orderId} recebida. Aguardando ação manual da oficina para iniciar diagnóstico.`
      );
    }
  });
}

main().catch((error) => {
  console.error('[diagnostic-worker] falha fatal:', error);
  process.exit(1);
});
