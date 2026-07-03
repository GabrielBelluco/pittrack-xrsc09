import express from 'express';
import Redis from 'ioredis';

const PORT = Number(process.env.PORT) || 3002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const STREAM_KEY = process.env.REDIS_STREAM_KEY || 'OSEventos';
const GROUP = 'projection-group';
const CONSUMER = 'projection-instance';

interface EnrichedEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

const store = new Map<string, EnrichedEvent[]>();

function buildTitle(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'SERVICE_ORDER_CREATED':
      return 'Ordem de serviço criada';
    case 'STATUS_UPDATED':
      return `Status atualizado para ${String(data.status ?? 'desconhecido')}`;
    case 'DIAGNOSIS_FINISHED':
      return 'Diagnóstico registrado';
    case 'BUDGET_CREATED':
      return 'Orçamento emitido';
    case 'BUDGET_APPROVED':
      return 'Orçamento aprovado';
    case 'REPAIR_STARTED':
      return 'Reparo iniciado';
    case 'FINAL_TEST_STARTED':
      return 'Teste final iniciado';
    case 'MAINTENANCE_FINISHED':
      return 'Manutenção finalizada';
    default:
      return `Evento: ${type}`;
  }
}

function extractDescription(type: string, data: Record<string, unknown>): string | undefined {
  return (data.description as string) || (data.reason as string) || undefined;
}

function parseEntry(entryId: string, fields: [string, string][]): EnrichedEvent | null {
  const map = new Map<string, string>();
  for (const [k, v] of fields) {
    map.set(k, v);
  }

  const type = map.get('type');
  const payloadRaw = map.get('payload');
  const createdAtRaw = map.get('createdAt');

  if (!type || !payloadRaw) return null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return null;
  }

  const data = (payload.data as Record<string, unknown>) || {};
  const ts = createdAtRaw || (payload.timestamp as string | undefined);
  const occurredAt = new Date(ts || Date.now());

  return {
    id: entryId,
    eventType: type,
    title: buildTitle(type, data),
    description: extractDescription(type, data),
    metadata: data,
    occurredAt
  };
}

function feedEntry(entryId: string, fields: [string, string][]): void {
  const event = parseEntry(entryId, fields);
  if (!event) return;

  const raw = event.metadata?.orderId;
  const orderId = typeof raw === 'string' ? raw : String(raw ?? '');
  if (!orderId) return;

  const list = store.get(orderId) || [];
  list.push(event);
  store.set(orderId, list);
}

function feedEntries(results: [string, [string, [string, string][]][]][]): void {
  for (const [, entries] of results) {
    for (const [entryId, fields] of entries) {
      feedEntry(entryId, fields);
    }
  }
}

async function initStream(redis: Redis): Promise<void> {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP, '$', 'MKSTREAM');
    console.log(`Consumer group "${GROUP}" criado.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('BUSYGROUP')) {
      console.log(`Consumer group "${GROUP}" já existe.`);
    } else {
      throw err;
    }
  }
}

async function readHistory(redis: Redis): Promise<void> {
  console.log('Reidratando eventos do stream...');
  let lastId = '0-0';
  for (;;) {
    const results: any = await redis.xreadgroup(
      'GROUP',
      GROUP,
      CONSUMER,
      'COUNT',
      100,
      'BLOCK',
      2000,
      'STREAMS',
      STREAM_KEY,
      lastId
    );

    if (!results) break;

    feedEntries(results);

    const lastEntry = results[0][1][results[0][1].length - 1];
    lastId = lastEntry[0];
  }
  console.log(`Reidratação concluída: ${store.size} ordens na memória.`);
}

async function listenLoop(redis: Redis): Promise<void> {
  console.log('Escutando novos eventos...');
  for (;;) {
    const results = await redis.xreadgroup(
      'GROUP',
      GROUP,
      CONSUMER,
      'COUNT',
      10,
      'BLOCK',
      5000,
      'STREAMS',
      STREAM_KEY,
      '>'
    );

    if (results) {
      feedEntries(results as any);
    }
  }
}

async function main() {
  const redis = new Redis(REDIS_URL);

  await initStream(redis);
  await readHistory(redis);

  const app = express();

  app.get('/timeline/:orderId', (req, res) => {
    const events = store.get(req.params.orderId) || [];
    res.json(events);
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
  });

  app.listen(PORT, () => {
    console.log(`PitTrack Projection rodando na porta ${PORT}`);
  });

  listenLoop(redis).catch((err) => {
    console.error('Erro no loop de eventos:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Erro ao inicializar projection:', err);
  process.exit(1);
});
