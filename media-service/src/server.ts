import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { MediaRoutes } from './routes/media.routes';
import { MediaUseCase } from './domain/use-cases/media.use-case';
import { MediaRepositoryMongoDB } from './infra/repositories/media.repository.mongodb';

const PORT = Number(process.env.PORT) || 3003;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/pittrack-media';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');

async function main() {
  await mongoose.connect(MONGO_URL);
  console.log(`[media-service] Conectado ao MongoDB: ${MONGO_URL}`);

  const repository = new MediaRepositoryMongoDB();
  const useCase = new MediaUseCase(repository);
  const routes = new MediaRoutes(useCase);

  const app = express();
  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json());

  app.use('/media', routes.build());

  app.use('/media/file/:filename', (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ error: 'Arquivo não encontrado.' });
      }
    });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
  });

  app.listen(PORT, () => {
    console.log(`[media-service] Rodando na porta ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[media-service] Erro ao inicializar:', err);
  process.exit(1);
});
