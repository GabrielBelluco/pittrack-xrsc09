import { Router, Request, Response } from 'express';
import { BudgetUseCase } from '../domain/use-cases/budget.use-case';
import { asyncHandler, paramId } from './utils';

export class BudgetRoutes {
  constructor(private readonly useCase: BudgetUseCase) {}

  build(): Router {
    const router = Router();

    router.post(
      '/:id/budget',
      asyncHandler(async (req: Request, res: Response) => {
        const { budgetId, items, totalAmount } = req.body;
        await this.useCase.emit({
          orderId: paramId(req),
          budgetId,
          items,
          totalAmount
        });
        res.status(201).send();
      })
    );

    const approveHandler = asyncHandler(async (req: Request, res: Response) => {
      const { budgetId } = req.body;
      await this.useCase.approve({ orderId: paramId(req), budgetId });
      res.status(204).send();
    });

    router.post('/:id/budget/approve', approveHandler);
    router.post('/:id/approve-budget', approveHandler);

    router.post(
      '/:id/budget/reject',
      asyncHandler(async (req: Request, res: Response) => {
        const { budgetId, reason } = req.body;
        await this.useCase.reject({ orderId: paramId(req), budgetId, reason });
        res.status(204).send();
      })
    );

    return router;
  }
}
