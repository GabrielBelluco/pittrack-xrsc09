import { Budget } from '../models/budget';
import { BudgetStatus } from '../types/budget-status';
import { ServiceOrderEventType } from '../types/service-order-event-type';
import { ServiceOrderRepository } from '../repositories/service-order.repository';
import { ServiceOrderEventPublisher } from '../events/service-order-event.publisher';

export interface EmitBudgetInput {
  orderId: string;
  budgetId: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
}

export interface ApproveBudgetInput {
  orderId: string;
  budgetId?: string;
}

export interface RejectBudgetInput {
  orderId: string;
  budgetId?: string;
  reason?: string;
}

export class BudgetUseCase {
  constructor(
    private readonly repository: ServiceOrderRepository,
    private readonly publisher: ServiceOrderEventPublisher
  ) {}

  async reject(input: RejectBudgetInput): Promise<void> {
    try {
      const order = await this.repository.findById(input.orderId);
      if (!order) {
        throw new Error('Ordem de serviço não encontrada.');
      }

      const budgetId = input.budgetId || order.budget?.id;
      if (!budgetId) {
        throw new Error('Nenhum orçamento encontrado para reprovação.');
      }

      await this.repository.rejectBudget(input.orderId, budgetId);
      const now = new Date();

      await this.publisher.publish({
        type: ServiceOrderEventType.BUDGET_REJECTED,
        orderId: input.orderId,
        data: { budgetId, reason: input.reason },
        timestamp: now
      });

      console.log(`[budget] Orçamento ${budgetId} reprovado na ordem ${input.orderId}`);
    } catch (error) {
      console.error(`[budget] Erro ao reprovar orçamento na ordem ${input.orderId}:`, error);
      throw error;
    }
  }

  async emit(input: EmitBudgetInput): Promise<void> {
    try {
      const order = await this.repository.findById(input.orderId);
      if (!order) {
        throw new Error('Ordem de serviço não encontrada.');
      }
      if (input.items.length === 0) {
        throw new Error('Orçamento deve conter ao menos um item.');
      }
      if (input.totalAmount <= 0) {
        throw new Error('Valor total do orçamento deve ser positivo.');
      }

      const budget: Budget = {
        id: input.budgetId,
        status: BudgetStatus.WAITING_APPROVAL,
        items: input.items,
        totalAmount: input.totalAmount,
        createdAt: new Date()
      };

      await this.repository.saveBudget(input.orderId, budget);
      const now = new Date();

      await this.publisher.publish({
        type: ServiceOrderEventType.BUDGET_CREATED,
        orderId: input.orderId,
        data: { budgetId: budget.id, totalAmount: budget.totalAmount },
        timestamp: now
      });

      console.log(`[budget] Orçamento ${budget.id} emitido para ordem ${input.orderId}`);
    } catch (error) {
      console.error(`[budget] Erro ao emitir orçamento para ordem ${input.orderId}:`, error);
      throw error;
    }
  }

  async approve(input: ApproveBudgetInput): Promise<void> {
    try {
      const order = await this.repository.findById(input.orderId);
      if (!order) {
        throw new Error('Ordem de serviço não encontrada.');
      }

      const budgetId = input.budgetId || order.budget?.id;
      if (!budgetId) {
        throw new Error('Nenhum orçamento encontrado para aprovação.');
      }

      await this.repository.approveBudget(input.orderId, budgetId);
      const now = new Date();

      await this.publisher.publish({
        type: ServiceOrderEventType.BUDGET_APPROVED,
        orderId: input.orderId,
        data: { budgetId },
        timestamp: now
      });

      console.log(`[budget] Orçamento ${budgetId} aprovado na ordem ${input.orderId}`);
    } catch (error) {
      console.error(`[budget] Erro ao aprovar orçamento na ordem ${input.orderId}:`, error);
      throw error;
    }
  }
}
