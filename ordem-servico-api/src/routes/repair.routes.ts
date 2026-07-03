import { Router, Request, Response } from 'express';
import { RepairUseCase } from '../domain/use-cases/repair.use-case';
import { asyncHandler, paramId } from './utils';

export class RepairRoutes {
  constructor(private readonly useCase: RepairUseCase) {}

  build(): Router {
    const router = Router();

    router.post(
      '/:id/repair/start',
      asyncHandler(async (req: Request, res: Response) => {
        await this.useCase.startRepair(paramId(req));
        res.status(204).send();
      })
    );

    router.post(
      '/:id/repair/final-test',
      asyncHandler(async (req: Request, res: Response) => {
        await this.useCase.startFinalTest(paramId(req));
        res.status(204).send();
      })
    );

    router.post(
      '/:id/repair/finish',
      asyncHandler(async (req: Request, res: Response) => {
        await this.useCase.finishMaintenance(paramId(req));
        res.status(204).send();
      })
    );

    return router;
  }
}
