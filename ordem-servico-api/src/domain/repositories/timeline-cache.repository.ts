import { TimelineEvent } from '../models/timeline-event';

export interface TimelineCacheRepository {
  findByOrderId(orderId: string): Promise<TimelineEvent[] | null>;
  save(orderId: string, events: TimelineEvent[]): Promise<void>;
}
