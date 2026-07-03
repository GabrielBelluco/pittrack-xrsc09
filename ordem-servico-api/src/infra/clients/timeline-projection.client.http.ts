import { TimelineProjectionClient } from '../../domain/clients/timeline-projection.client';
import { TimelineEvent } from '../../domain/models/timeline-event';

const PROJECTION_URL = process.env.TIMELINE_PROJECTION_URL || 'http://projection:3002';

export class TimelineProjectionClientHttp implements TimelineProjectionClient {
  async fetchTimeline(orderId: string): Promise<TimelineEvent[]> {
    const res = await fetch(`${PROJECTION_URL}/timeline/${orderId}`);
    if (!res.ok) {
      throw new Error(`Serviço de projeção retornou status ${res.status}`);
    }
    return res.json() as Promise<TimelineEvent[]>;
  }
}
