process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'repair-worker';

const { waitForDatabase } = require('../db');
const ordersService = require('../services/orders.service');
const { EVENT_TYPES } = require('../events/constants');
const { publishEvent } = require('../events/publisher');
const { startStreamConsumer } = require('../events/consumer');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      console.log(`[repair-worker] Orçamento aprovado para ordem #${orderId}. Iniciando reparo.`);

      await ordersService.updateOrderStatus(
        orderId,
        'Em Reparo',
        'Reparo iniciado após aprovação do orçamento.',
        'repair-worker'
      );

      await publishEvent(EVENT_TYPES.REPAIR_STARTED, {
        orderId,
        status: 'Em Reparo',
        message: `Reparo iniciado para a ordem #${orderId}.`
      });

      await sleep(1500);

      await ordersService.updateOrderStatus(
        orderId,
        'Em Testes Finais',
        'Reparo concluído. Veículo em testes finais.',
        'repair-worker'
      );

      await publishEvent(EVENT_TYPES.FINAL_TEST_STARTED, {
        orderId,
        status: 'Em Testes Finais',
        message: `Testes finais iniciados para a ordem #${orderId}.`
      });

      await sleep(1500);

      await ordersService.updateOrderStatus(
        orderId,
        'Finalizado',
        'Manutenção finalizada pelo worker de reparo.',
        'repair-worker'
      );

      await publishEvent(EVENT_TYPES.MAINTENANCE_FINISHED, {
        orderId,
        status: 'Finalizado',
        message: `Manutenção finalizada para a ordem #${orderId}.`
      });

      await ordersService.updateOrderStatus(
        orderId,
        'Disponível para Retirada',
        'Veículo liberado para retirada do cliente.',
        'repair-worker'
      );

      console.log(`[repair-worker] Ordem #${orderId} concluída e liberada para retirada.`);
    }
  });
}

main().catch((error) => {
  console.error('[repair-worker] falha fatal:', error);
  process.exit(1);
});
