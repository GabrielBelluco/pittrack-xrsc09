import { ServiceOrderEventType } from '../types/service-order-event-type';

export interface TimelineEvent {
  id: string;
  eventType: ServiceOrderEventType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}
