import { Router, Request, Response } from 'express';
import { ServiceOrderUseCase } from '../domain/use-cases/service-order.use-case';
import { asyncHandler, paramId } from './utils';

function toOrderListResponse(order: any) {
  return {
    id: order.id,
    status: order.status,
    customer: {
      name: order.customer.name,
      phone: order.customer.phone
    },
    vehicle: {
      plate: order.vehicle.plate,
      model: order.vehicle.model
    }
  };
}

function toOrderDetailResponse(order: any) {
  return {
    id: order.id,
    status: order.status,
    complaint: order.complaint,
    customer: order.customer,
    vehicle: order.vehicle,
    assignedTo: order.assignedTo,
    diagnosis: order.diagnosis
      ? {
          description: order.diagnosis.description,
          rootCause: order.diagnosis.rootCause ?? '',
          observations: order.diagnosis.observations ?? ''
        }
      : null,
    timeline: (order.timeline || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      timestamp: e.occurredAt,
      actor: ''
    })),
    budgets: order.budget
      ? [{
          id: order.budget.id,
          description: order.budget.items.map((i: any) => i.description).join(', '),
          amount: order.budget.totalAmount,
          approved: order.budget.status === 'APPROVED'
        }]
      : [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt
  };
}

export class ServiceOrderRoutes {
  constructor(private readonly useCase: ServiceOrderUseCase) {}

  build(): Router {
    const router = Router();

    router.get(
      '/',
      asyncHandler(async (_req: Request, res: Response) => {
        const orders = await this.useCase.findAll();
        res.json(orders.map(toOrderListResponse));
      })
    );

    router.get(
      '/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const order = await this.useCase.getById(paramId(req));
        if (!order) {
          return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }
        return res.json(toOrderDetailResponse(order));
      })
    );

    router.post(
      '/',
      asyncHandler(async (req: Request, res: Response) => {
        const order = await this.useCase.create(req.body);
        res.status(201).json(toOrderDetailResponse(order));
      })
    );

    router.post(
      '/:id/status',
      asyncHandler(async (req: Request, res: Response) => {
        const { status, reason } = req.body;
        if (!status) {
          return res.status(400).json({ error: 'O campo status é obrigatório.' });
        }
        await this.useCase.updateStatus({ orderId: paramId(req), status, reason });
        return res.status(204).send();
      })
    );

    router.post(
      '/:id/cancel',
      asyncHandler(async (req: Request, res: Response) => {
        await this.useCase.cancel({ orderId: paramId(req), reason: req.body.reason });
        res.status(204).send();
      })
    );

    router.get(
      '/:id/timeline',
      asyncHandler(async (req: Request, res: Response) => {
        const timeline = await this.useCase.getTimeline(paramId(req));
        res.json(timeline);
      })
    );

    return router;
  }
}
