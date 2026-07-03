import { MediaType } from '../types/media-type';

export interface Media {
  id?: string;
  orderId: string;
  step: string;
  type: MediaType;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
  createdAt: Date;
}
