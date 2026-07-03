import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { MediaUseCase } from '../domain/use-cases/media.use-case';
import { MediaType } from '../domain/types/media-type';

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não suportado: ${file.mimetype}`));
    }
  }
});

export class MediaRoutes {
  constructor(private readonly useCase: MediaUseCase) {}

  build(): Router {
    const router = Router();

    router.post(
      '/upload',
      upload.single('file'),
      async (req: Request, res: Response) => {
        try {
          const file = req.file;
          if (!file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
          }

          const { orderId, step, type, description } = req.body;
          if (!orderId || !step || !type) {
            return res.status(400).json({ error: 'Campos obrigatórios: orderId, step, type.' });
          }

          if (![MediaType.PHOTO, MediaType.VIDEO].includes(type)) {
            return res.status(400).json({ error: 'type deve ser "photo" ou "video".' });
          }

          const media = await this.useCase.upload({
            orderId,
            step,
            type,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            description
          });

          res.status(201).json(media);
        } catch (err: any) {
          console.error('[media] Erro no upload:', err);
          res.status(500).json({ error: err.message || 'Erro interno no upload.' });
        }
      }
    );

    router.get(
      '/:orderId',
      async (req: Request, res: Response) => {
        try {
          const mediaList = await this.useCase.listByOrder(String(req.params.orderId));
          res.json(mediaList);
        } catch (err: any) {
          console.error('[media] Erro ao listar mídias:', err);
          res.status(500).json({ error: err.message || 'Erro ao listar mídias.' });
        }
      }
    );

    return router;
  }
}
