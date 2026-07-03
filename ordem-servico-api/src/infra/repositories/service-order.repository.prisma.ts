import { PrismaClient } from '@prisma/client';
import { ServiceOrderRepository } from '../../domain/repositories/service-order.repository';
import { ServiceOrder } from '../../domain/models/service-order';
import { ServiceOrderStatus } from '../../domain/types/service-order-status';
import { BudgetStatus } from '../../domain/types/budget-status';
import { ServiceOrderEventType } from '../../domain/types/service-order-event-type';
import { Diagnosis } from '../../domain/models/diagnosis';
import { Budget } from '../../domain/models/budget';

export class ServiceOrderRepositoryPrisma implements ServiceOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ServiceOrder | null> {
    const row = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        diagnosis: true,
        budget: { include: { items: true } },
        events: true
      }
    });

    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findAll(): Promise<ServiceOrder[]> {
    const rows = await this.prisma.serviceOrder.findMany({
      include: {
        customer: true,
        vehicle: true,
        diagnosis: true,
        budget: { include: { items: true } },
        events: true
      }
    });

    return rows.map((row) => this.mapToDomain(row));
  }

  async save(order: ServiceOrder): Promise<ServiceOrder> {
    const saved = await this.prisma.$transaction(async (tx) => {
      await tx.customer.upsert({
        where: { id: order.customer.id },
        create: {
          id: order.customer.id,
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email ?? null
        },
        update: {
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email ?? null
        }
      });

      await tx.vehicle.upsert({
        where: { id: order.vehicle.plate },
        create: {
          id: order.vehicle.plate,
          plate: order.vehicle.plate,
          brand: order.vehicle.brand,
          model: order.vehicle.model,
          year: order.vehicle.year,
          mileage: order.vehicle.mileage ?? null
        },
        update: {
          brand: order.vehicle.brand,
          model: order.vehicle.model,
          year: order.vehicle.year,
          mileage: order.vehicle.mileage ?? null
        }
      });

      return tx.serviceOrder.create({
        data: {
          id: order.id,
          status: order.status,
          customerId: order.customer.id,
          vehicleId: order.vehicle.plate,
          complaint: order.complaint ?? null,
          assignedTo: order.assignedTo ?? null,
          completedAt: order.completedAt ?? null,
          cancelledAt: order.cancelledAt ?? null,
          version: order.version
        },
        include: {
          customer: true,
          vehicle: true,
          diagnosis: true,
          budget: { include: { items: true } },
          events: true
        }
      });
    });

    return saved ? this.mapToDomain(saved) : order;
  }

  async updateStatus(id: string, status: ServiceOrderStatus): Promise<void> {
    await this.prisma.serviceOrder.update({
      where: { id },
      data: { status }
    });
  }

  async saveDiagnosis(orderId: string, diagnosis: Diagnosis): Promise<void> {
    await this.prisma.diagnosis.upsert({
      where: { orderId },
      create: {
        orderId,
        description: diagnosis.description,
        rootCause: diagnosis.rootCause ?? null,
        observations: diagnosis.observations ?? null,
        startedAt: diagnosis.startedAt ?? null,
        finishedAt: diagnosis.finishedAt ?? null
      },
      update: {
        description: diagnosis.description,
        rootCause: diagnosis.rootCause ?? null,
        observations: diagnosis.observations ?? null,
        startedAt: diagnosis.startedAt ?? null,
        finishedAt: diagnosis.finishedAt ?? null
      }
    });
  }

  async saveBudget(orderId: string, budget: Budget): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceOrderBudget.upsert({
        where: { orderId },
        create: {
          id: budget.id,
          orderId,
          status: budget.status,
          totalAmount: budget.totalAmount,
          approvedAt: budget.approvedAt ?? null
        },
        update: {
          status: budget.status,
          totalAmount: budget.totalAmount,
          approvedAt: budget.approvedAt ?? null
        }
      });

      for (const item of budget.items) {
        await tx.budgetItem.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            budgetId: budget.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          },
          update: {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          }
        });
      }
    });
  }

  async approveBudget(orderId: string, budgetId: string): Promise<void> {
    await this.prisma.serviceOrderBudget.update({
      where: { id: budgetId },
      data: {
        status: BudgetStatus.APPROVED,
        approvedAt: new Date()
      }
    });
  }

  async rejectBudget(orderId: string, budgetId: string): Promise<void> {
    await this.prisma.serviceOrderBudget.update({
      where: { id: budgetId },
      data: {
        status: BudgetStatus.REJECTED
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.serviceOrder.delete({ where: { id } });
  }

  private mapToDomain(row: any): ServiceOrder {
    return {
      id: row.id,
      status: row.status as ServiceOrderStatus,
      customer: {
        id: row.customer.id,
        name: row.customer.name,
        phone: row.customer.phone,
        email: row.customer.email ?? undefined
      },
      vehicle: {
        plate: row.vehicle.plate,
        brand: row.vehicle.brand,
        model: row.vehicle.model,
        year: row.vehicle.year,
        mileage: row.vehicle.mileage ?? undefined
      },
      diagnosis: row.diagnosis
        ? {
            description: row.diagnosis.description,
            rootCause: row.diagnosis.rootCause ?? undefined,
            observations: row.diagnosis.observations ?? undefined,
            startedAt: row.diagnosis.startedAt ?? undefined,
            finishedAt: row.diagnosis.finishedAt ?? undefined
          }
        : undefined,
      budget: row.budget
        ? {
            id: row.budget.id,
            status: row.budget.status as BudgetStatus,
            items: row.budget.items.map((i: any) => ({
              id: i.id,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice
            })),
            totalAmount: row.budget.totalAmount,
            createdAt: row.budget.createdAt,
            approvedAt: row.budget.approvedAt ?? undefined
          }
        : undefined,
      timeline: (row.events ?? []).map((e: any) => ({
        id: e.id,
        eventType: e.eventType as ServiceOrderEventType,
        title: e.title,
        description: e.description ?? undefined,
        metadata: e.metadata as Record<string, unknown> | undefined,
        occurredAt: e.occurredAt
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt ?? undefined,
      cancelledAt: row.cancelledAt ?? undefined,
      version: row.version
    };
  }
}
