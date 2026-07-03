import { Media } from '../models/media';
import { MediaType } from '../types/media-type';
import { MediaRepository } from '../repositories/media.repository';

export interface UploadMediaInput {
  orderId: string;
  step: string;
  type: MediaType;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
}

export class MediaUseCase {
  constructor(private readonly repository: MediaRepository) {}

  async upload(input: UploadMediaInput): Promise<Media> {
    const media: Media = {
      orderId: input.orderId,
      step: input.step,
      type: input.type,
      filename: input.filename,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size,
      description: input.description,
      createdAt: new Date()
    };

    const saved = await this.repository.save(media);
    console.log(`[media] ${input.type} registrado: ${saved.id} para ordem ${input.orderId}`);
    return saved;
  }

  async listByOrder(orderId: string): Promise<Media[]> {
    return this.repository.findByOrderId(orderId);
  }

  async getById(id: string): Promise<Media | null> {
    return this.repository.findById(id);
  }
}
