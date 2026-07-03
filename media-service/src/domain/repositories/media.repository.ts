import { Media } from '../models/media';

export interface MediaRepository {
  save(media: Media): Promise<Media>;
  findByOrderId(orderId: string): Promise<Media[]>;
  findById(id: string): Promise<Media | null>;
}
