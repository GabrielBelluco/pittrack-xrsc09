import { ServiceOrderEventType } from '../types/service-order-event-type';
import { ServiceOrderRepository } from '../repositories/service-order.repository';
import { ServiceOrderEventPublisher } from '../events/service-order-event.publisher';

export class RepairUseCase {
  constructor(
    private readonly repository: ServiceOrderRepository,
    private readonly publisher: ServiceOrderEventPublisher
  ) {}

  async startRepair(orderId: string): Promise<void> {
    try {
      const order = await this.repository.findById(orderId);
      if (!order) {
        throw new Error('Ordem de serviço não encontrada.');
      }

      const now = new Date();

      await this.publisher.publish({
        type: ServiceOrderEventType.REPAIR_STARTED,
        orderId,
        data: {},
        timestamp: now
      });

      console.log(`[repair] Reparo iniciado na ordem ${orderId}`);
    } catch (error) {
      console.error(`[repair] Erro ao iniciar reparo na ordem ${orderId}:`, error);
      throw error;
    }
  }

  async startFinalTest(orderId: string): Promise<void> {
    try {
      const order = await this.repository.findById(orderId);
      if (!order) {
        throw new Error('Ordem de serviço não encontrada.');
      }

      const now = new Date();

      await this.publisher.publish({
        type: ServiceOrderEventType.FINAL_TEST_STARTED,
        orderId,
        data: {},
        timestamp: now
      });

      console.log(`[repair] Teste final iniciado na ordem ${orderId}`);
    } catch (error) {
      console.error(`[repair] Erro ao iniciar teste final na ordem ${orderId}:`, error);
      throw error;
    }
  }

  async finishMaintenance(orderId: string): Promise<void> {
    try {
      const order = await this.repository.findById(orderId);
      if (!order) {
        throw new Error('Ordem de serviço não encontrada.');
      }

      const now = new Date();

      await this.publisher.publish({
        type: ServiceOrderEventType.MAINTENANCE_FINISHED,
        orderId,
        data: {},
        timestamp: now
      });

      console.log(`[repair] Manutenção finalizada na ordem ${orderId}`);
    } catch (error) {
      console.error(`[repair] Erro ao finalizar manutenção na ordem ${orderId}:`, error);
      throw error;
    }
  }
}
