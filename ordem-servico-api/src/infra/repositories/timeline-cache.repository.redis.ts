import Redis from 'ioredis';
import { TimelineCacheRepository } from '../../domain/repositories/timeline-cache.repository';
import { TimelineEvent } from '../../domain/models/timeline-event';

const TTL_SECONDS = 300;

export class TimelineCacheRepositoryRedis implements TimelineCacheRepository {
  constructor(private readonly redis: Redis) {}

  async findByOrderId(orderId: string): Promise<TimelineEvent[] | null> {
    const raw = await this.redis.get(`timeline:${orderId}`);
    if (!raw) return null;
    return JSON.parse(raw) as TimelineEvent[];
  }

  async save(orderId: string, events: TimelineEvent[]): Promise<void> {
    await this.redis.setex(`timeline:${orderId}`, TTL_SECONDS, JSON.stringify(events));
  }
}
