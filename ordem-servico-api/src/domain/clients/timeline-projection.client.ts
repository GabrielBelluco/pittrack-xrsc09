import { TimelineEvent } from '../models/timeline-event';

export interface TimelineProjectionClient {
  fetchTimeline(orderId: string): Promise<TimelineEvent[]>;
}
