process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'diagnostic-worker';

const { waitForDatabase } = require('../db');
const ordersService = require('../services/orders.service');
const { EVENT_TYPES } = require('../events/constants');
const { publishEvent } = require('../events/publisher');
const { startStreamConsumer } = require('../events/consumer');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      console.log(`[diagnostic-worker] Ordem #${orderId} recebida. Iniciando diagnóstico distribuído.`);

      await ordersService.updateOrderStatus(
        orderId,
        'Em Diagnóstico',
        'Diagnóstico iniciado pelo worker após evento de criação.',
        'diagnostic-worker'
      );

      await publishEvent(EVENT_TYPES.DIAGNOSIS_STARTED, {
        orderId,
        status: 'Em Diagnóstico',
        message: `Diagnóstico iniciado para a ordem #${orderId}.`
      });

      await sleep(1500);

      await publishEvent(EVENT_TYPES.DIAGNOSIS_FINISHED, {
        orderId,
        message: `Diagnóstico concluído para a ordem #${orderId}. A oficina pode gerar o orçamento.`
      });

      console.log(`[diagnostic-worker] Diagnóstico simulado finalizado para ordem #${orderId}.`);
    }
  });
}

main().catch((error) => {
  console.error('[diagnostic-worker] falha fatal:', error);
  process.exit(1);
});
