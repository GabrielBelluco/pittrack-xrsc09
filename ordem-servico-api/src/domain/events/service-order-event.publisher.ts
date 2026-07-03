import { ServiceOrderEventType } from '../types/service-order-event-type';

export interface ServiceOrderEvent {
  type: ServiceOrderEventType;
  orderId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface ServiceOrderEventPublisher {
  publish(event: ServiceOrderEvent): Promise<void>;
}
