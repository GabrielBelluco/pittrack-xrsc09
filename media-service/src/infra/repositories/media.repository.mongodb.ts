import { Schema, model, Model } from 'mongoose';
import { Media } from '../../domain/models/media';
import { MediaRepository } from '../../domain/repositories/media.repository';

const mediaSchema = new Schema({
  orderId: { type: String, required: true, index: true },
  step: { type: String, required: true },
  type: { type: String, required: true, enum: ['photo', 'video'] },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  description: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const MediaModel: Model<Media> = model<Media>('Media', mediaSchema);

export class MediaRepositoryMongoDB implements MediaRepository {
  async save(media: Media): Promise<Media> {
    const doc = new MediaModel({
      orderId: media.orderId,
      step: media.step,
      type: media.type,
      filename: media.filename,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      description: media.description,
      createdAt: media.createdAt
    });
    const saved = await doc.save();
    return { ...media, id: saved._id.toString() };
  }

  async findByOrderId(orderId: string): Promise<Media[]> {
    const docs = await MediaModel.find({ orderId }).sort({ createdAt: -1 }).lean();
    return docs.map((d: any) => ({
      id: d._id.toString(),
      orderId: d.orderId,
      step: d.step,
      type: d.type,
      filename: d.filename,
      originalName: d.originalName,
      mimeType: d.mimeType,
      size: d.size,
      description: d.description,
      createdAt: d.createdAt
    }));
  }

  async findById(id: string): Promise<Media | null> {
    const doc = await MediaModel.findById(id).lean();
    if (!doc) return null;
    const d = doc as any;
    return {
      id: d._id.toString(),
      orderId: d.orderId,
      step: d.step,
      type: d.type,
      filename: d.filename,
      originalName: d.originalName,
      mimeType: d.mimeType,
      size: d.size,
      description: d.description,
      createdAt: d.createdAt
    };
  }
}
