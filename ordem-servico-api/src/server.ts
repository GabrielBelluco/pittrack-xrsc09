import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import { prisma } from './infra/database/prisma';
import { ServiceOrderRepositoryPrisma } from './infra/repositories/service-order.repository.prisma';
import { TimelineCacheRepositoryRedis } from './infra/repositories/timeline-cache.repository.redis';
import { ServiceOrderEventPublisherRedis } from './infra/events/service-order-event-publisher.redis';
import { TimelineProjectionClientHttp } from './infra/clients/timeline-projection.client.http';
import { ServiceOrderUseCase } from './domain/use-cases/service-order.use-case';
import { DiagnosisUseCase } from './domain/use-cases/diagnosis.use-case';
import { BudgetUseCase } from './domain/use-cases/budget.use-case';
import { RepairUseCase } from './domain/use-cases/repair.use-case';
import { ServiceOrderRoutes } from './routes/service-order.routes';
import { DiagnosisRoutes } from './routes/diagnosis.routes';
import { BudgetRoutes } from './routes/budget.routes';
import { RepairRoutes } from './routes/repair.routes';

const PORT = Number(process.env.PORT) || 3001;
const NOTIFICATIONS_CHANNEL = 'live-notifications';

async function main() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  const orderRepo = new ServiceOrderRepositoryPrisma(prisma);
  const cacheRepo = new TimelineCacheRepositoryRedis(redis);
  const publisher = new ServiceOrderEventPublisherRedis(redis);
  const projectionClient = new TimelineProjectionClientHttp();

  const serviceOrderUseCase = new ServiceOrderUseCase(orderRepo, publisher, cacheRepo, projectionClient);
  const diagnosisUseCase = new DiagnosisUseCase(orderRepo, publisher);
  const budgetUseCase = new BudgetUseCase(orderRepo, publisher);
  const repairUseCase = new RepairUseCase(orderRepo, publisher);

  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: '*' }
  });

  redisSub.subscribe(NOTIFICATIONS_CHANNEL, (err) => {
    if (err) {
      console.error('Erro ao subscrever no canal Redis:', err);
    }
  });

  redisSub.on('message', (_channel, message) => {
    try {
      const parsed = JSON.parse(message);
      io.emit('order-event', parsed);
    } catch {
      console.warn('Mensagem inválida no canal Redis:', message);
    }
  });

  app.use(cors());
  app.use(express.json());

  app.use('/orders', new ServiceOrderRoutes(serviceOrderUseCase).build());
  app.use('/orders', new DiagnosisRoutes(diagnosisUseCase).build());
  app.use('/orders', new BudgetRoutes(budgetUseCase).build());
  app.use('/orders', new RepairRoutes(repairUseCase).build());

  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
  });

  server.listen(PORT, () => {
    console.log(`PitTrack API rodando na porta ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Erro ao inicializar servidor:', err);
  process.exit(1);
});
