import { Router, Request, Response } from 'express';
import { DiagnosisUseCase } from '../domain/use-cases/diagnosis.use-case';
import { asyncHandler, paramId } from './utils';

export class DiagnosisRoutes {
  constructor(private readonly useCase: DiagnosisUseCase) {}

  build(): Router {
    const router = Router();

    router.post(
      '/:id/diagnosis/start',
      asyncHandler(async (req: Request, res: Response) => {
        await this.useCase.start(paramId(req));
        res.status(204).send();
      })
    );

    router.post(
      '/:id/diagnosis',
      asyncHandler(async (req: Request, res: Response) => {
        const { description, rootCause, observations } = req.body;
        await this.useCase.register({
          orderId: paramId(req),
          description,
          rootCause,
          observations
        });
        res.status(204).send();
      })
    );

    return router;
  }
}
