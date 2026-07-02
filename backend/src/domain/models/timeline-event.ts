import { ServiceOrderEventType } from './enums';

export interface TimelineEvent {
  id: string;
  eventType: ServiceOrderEventType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}
