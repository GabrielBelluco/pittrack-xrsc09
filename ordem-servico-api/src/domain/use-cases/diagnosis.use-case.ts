import { Diagnosis } from '../models/diagnosis';
import { ServiceOrderEventType } from '../types/service-order-event-type';
import { ServiceOrderRepository } from '../repositories/service-order.repository';
import { ServiceOrderEventPublisher } from '../events/service-order-event.publisher';

export interface RegisterDiagnosisInput {
  orderId: string;
  description: string;
  rootCause?: string;
  observations?: string;
}

export class DiagnosisUseCase {
  constructor(
    private readonly repository: ServiceOrderRepository,
    private readonly publisher: ServiceOrderEventPublisher
  ) {}

  async start(orderId: string): Promise<void> {
    try {
      const order = await this.repository.findById(orderId);
      if (!order) {
        throw new Error('Ordem de serviço não encontrada.');
      }

      const now = new Date();

      await this.publisher.publish({
        type: ServiceOrderEventType.DIAGNOSIS_STARTED,
        orderId,
        data: {},
        timestamp: now
      });

      console.log(`[diagnosis] Diagnóstico iniciado na ordem ${orderId}`);
    } catch (error) {
      console.error(`[diagnosis] Erro ao iniciar diagnóstico na ordem ${orderId}:`, error);
      throw error;
    }
  }

  async register(input: RegisterDiagnosisInput): Promise<void> {
    try {
      const order = await this.repository.findById(input.orderId);
      if (!order) {
        throw new Error('Ordem de serviço não encontrada.');
      }
      if (!input.description) {
        throw new Error('Descrição do diagnóstico é obrigatória.');
      }

      const now = new Date();
      const diagnosis: Diagnosis = {
        description: input.description,
        rootCause: input.rootCause,
        observations: input.observations,
        startedAt: order.diagnosis?.startedAt ?? now,
        finishedAt: now
      };

      await this.repository.saveDiagnosis(input.orderId, diagnosis);

      await this.publisher.publish({
        type: ServiceOrderEventType.DIAGNOSIS_FINISHED,
        orderId: input.orderId,
        data: { description: input.description },
        timestamp: now
      });

      console.log(`[diagnosis] Diagnóstico registrado na ordem ${input.orderId}`);
    } catch (error) {
      console.error(`[diagnosis] Erro ao registrar diagnóstico na ordem ${input.orderId}:`, error);
      throw error;
    }
  }
}
