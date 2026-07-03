import Redis from 'ioredis';
import { ServiceOrderEventPublisher, ServiceOrderEvent } from '../../domain/events/service-order-event.publisher';

const STREAM_KEY = process.env.REDIS_STREAM_KEY || 'OSEventos';
const NOTIFICATIONS_CHANNEL = 'live-notifications';

export class ServiceOrderEventPublisherRedis implements ServiceOrderEventPublisher {
  constructor(private readonly redis: Redis) {}

  async publish(event: ServiceOrderEvent): Promise<void> {
    await this.redis.xadd(
      STREAM_KEY,
      '*',
      'type', event.type,
      'orderId', String(event.orderId),
      'payload', JSON.stringify(event),
      'createdAt', event.timestamp.toISOString()
    );

    await this.redis.publish(
      NOTIFICATIONS_CHANNEL,
      JSON.stringify({
        type: event.type,
        message: event.data?.description || `Evento ${event.type}`,
        orderId: event.orderId,
        timestamp: event.timestamp.toISOString(),
        source: 'ordem-servico-api'
      })
    );
  }
}
