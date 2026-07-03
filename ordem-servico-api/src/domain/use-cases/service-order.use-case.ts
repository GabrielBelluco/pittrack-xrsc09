import { ServiceOrder } from '../models/service-order';
import { ServiceOrderStatus } from '../types/service-order-status';
import { ServiceOrderEventType } from '../types/service-order-event-type';
import { ServiceOrderRepository } from '../repositories/service-order.repository';
import { ServiceOrderEventPublisher } from '../events/service-order-event.publisher';
import { TimelineCacheRepository } from '../repositories/timeline-cache.repository';
import { TimelineProjectionClient } from '../clients/timeline-projection.client';
import { TimelineEvent } from '../models/timeline-event';
import { randomUUID as uuid } from 'node:crypto';

export interface CreateServiceOrderInput {
  id?: string;
  customer: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
  };
  vehicle: {
    plate: string;
    brand?: string;
    model: string;
    year: number;
    mileage?: number;
  };
  complaint?: string;
  assignedTo?: string;
}

export interface UpdateStatusInput {
  orderId: string;
  status: ServiceOrderStatus;
  reason?: string;
}

export interface CancelServiceOrderInput {
  orderId: string;
  reason?: string;
}

export class ServiceOrderUseCase {
  constructor(
    private readonly repository: ServiceOrderRepository,
    private readonly publisher: ServiceOrderEventPublisher,
    private readonly cache: TimelineCacheRepository,
    private readonly projectionClient: TimelineProjectionClient
  ) {}

  async create(input: CreateServiceOrderInput): Promise<ServiceOrder> {
    try {
      if (!input.customer.name || !input.customer.phone) {
        throw new Error('Nome e telefone do cliente são obrigatórios.');
      }
      if (!input.vehicle.plate || !input.vehicle.model) {
        throw new Error('Placa e modelo do veículo são obrigatórios.');
      }

      const order: ServiceOrder = {
        id: input.id || uuid(),
        status: ServiceOrderStatus.CREATED,
        customer: {
          id: input.customer.id || uuid(),
          name: input.customer.name,
          phone: input.customer.phone,
          email: input.customer.email
        },
        vehicle: {
          plate: input.vehicle.plate,
          brand: input.vehicle.brand || '',
          model: input.vehicle.model,
          year: input.vehicle.year,
          mileage: input.vehicle.mileage
        },
        complaint: input.complaint,
        assignedTo: input.assignedTo,
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const saved = await this.repository.save(order);
      const now = new Date();

      await this.publisher.publish({
        type: ServiceOrderEventType.SERVICE_ORDER_CREATED,
        orderId: saved.id,
        data: { customerId: saved.customer.id, vehiclePlate: saved.vehicle.plate },
        timestamp: now
      });

      console.log(`[service-order] Ordem ${saved.id} criada com sucesso`);
      return saved;
    } catch (error) {
      console.error(`[service-order] Erro ao criar ordem:`, error);
      throw error;
    }
  }

  async findAll(): Promise<ServiceOrder[]> {
    try {
      const orders = await this.repository.findAll();
      console.log(`[service-order] Listadas ${orders.length} ordens`);
      return orders;
    } catch (error) {
      console.error(`[service-order] Erro ao listar ordens:`, error);
      throw error;
    }
  }

  async getById(id: string): Promise<ServiceOrder | null> {
    try {
      const order = await this.repository.findById(id);
      console.log(`[service-order] Ordem ${id} ${order ? 'encontrada' : 'não encontrada'}`);
      return order;
    } catch (error) {
      console.error(`[service-order] Erro ao buscar ordem ${id}:`, error);
      throw error;
    }
  }

  async updateStatus(input: UpdateStatusInput): Promise<void> {
    try {
      const order = await this.repository.findById(input.orderId);
      if (!order) {
        throw new Error('Ordem de serviço não encontrada.');
      }

      const now = new Date();

      await this.publisher.publish({
        type: ServiceOrderEventType.STATUS_UPDATED,
        orderId: input.orderId,
        data: { status: input.status, reason: input.reason },
        timestamp: now
      });

      console.log(`[service-order] Status da ordem ${input.orderId} atualizado para ${input.status}`);
    } catch (error) {
      console.error(`[service-order] Erro ao atualizar status da ordem ${input.orderId}:`, error);
      throw error;
    }
  }

  async cancel(input: CancelServiceOrderInput): Promise<void> {
    try {
      const order = await this.repository.findById(input.orderId);
      if (!order) {
        throw new Error('Ordem de serviço não encontrada.');
      }

      const now = new Date();

      await this.publisher.publish({
        type: ServiceOrderEventType.STATUS_UPDATED,
        orderId: input.orderId,
        data: { status: ServiceOrderStatus.CANCELLED, reason: input.reason },
        timestamp: now
      });

      console.log(`[service-order] Ordem ${input.orderId} cancelada`);
    } catch (error) {
      console.error(`[service-order] Erro ao cancelar ordem ${input.orderId}:`, error);
      throw error;
    }
  }

  async getTimeline(orderId: string): Promise<TimelineEvent[]> {
    try {
      const cached = await this.cache.findByOrderId(orderId);
      if (cached) {
        console.log(`[service-order] Timeline da ordem ${orderId} obtida do cache`);
        return cached;
      }

      const timeline = await this.projectionClient.fetchTimeline(orderId);
      await this.cache.save(orderId, timeline);
      console.log(`[service-order] Timeline da ordem ${orderId} obtida da projeção (${timeline.length} eventos)`);
      return timeline;
    } catch (error) {
      console.error(`[service-order] Erro ao obter timeline da ordem ${orderId}:`, error);
      throw error;
    }
  }
}
