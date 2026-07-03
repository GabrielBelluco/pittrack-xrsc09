import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import {
  STREAM_KEY,
  GROUP,
  CONSUMER,
  isTerminal,
  validateTransition,
  ServiceOrderStatus
} from './rules';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

function log(...args: unknown[]): void {
  console.log(`[ordem-servico-state-manager] ${new Date().toISOString()}`, ...args);
}

function warn(...args: unknown[]): void {
  console.warn(`[ordem-servico-state-manager] ${new Date().toISOString()}`, ...args);
}

async function initStream(): Promise<void> {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP, '$', 'MKSTREAM');
    log(`Consumer group "${GROUP}" criado no stream "${STREAM_KEY}".`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('BUSYGROUP')) {
      log(`Consumer group "${GROUP}" já existe.`);
    } else {
      throw err;
    }
  }
}

function parseEntry(fields: string[]): {
  type: string;
  orderId: string;
  data: Record<string, unknown>;
} | null {
  const map = new Map<string, string>();
  for (let i = 0; i < fields.length; i += 2) {
    map.set(fields[i], fields[i + 1]);
  }
  const type = map.get('type');
  const orderId = map.get('orderId');
  const payloadRaw = map.get('payload');
  if (!type || !orderId || !payloadRaw) return null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return null;
  }

  return {
    type,
    orderId,
    data: (payload.data as Record<string, unknown>) || {}
  };
}

function eventTitle(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'SERVICE_ORDER_CREATED': return 'Ordem de serviço criada';
    case 'STATUS_UPDATED':
      return String(data.status ?? '') === 'CANCELLED'
        ? 'Ordem de serviço cancelada'
        : `Status atualizado para ${String(data.status ?? '')}`;
    case 'DIAGNOSIS_FINISHED': return 'Diagnóstico registrado';
    case 'BUDGET_CREATED': return 'Orçamento emitido';
    case 'BUDGET_APPROVED': return 'Orçamento aprovado';
    case 'BUDGET_REJECTED': {
      const r = String(data.reason ?? '');
      return r ? `Orçamento reprovado: ${r}` : 'Orçamento reprovado';
    }
    case 'REPAIR_STARTED': return 'Reparo iniciado';
    case 'FINAL_TEST_STARTED': return 'Teste final iniciado';
    case 'MAINTENANCE_FINISHED': return 'Manutenção finalizada';
    default: return type;
  }
}

function eventDescription(type: string, data: Record<string, unknown>): string | undefined {
  if (type === 'STATUS_UPDATED') return String(data.reason ?? '');
  if (type === 'DIAGNOSIS_FINISHED') return String(data.description ?? '');
  if (type === 'BUDGET_REJECTED') return String(data.reason ?? '');
  return undefined;
}

async function saveEvent(type: string, orderId: string, data: Record<string, unknown>): Promise<void> {
  await prisma.event.create({
    data: {
      id: randomUUID(),
      orderId,
      eventType: type,
      title: eventTitle(type, data),
      description: eventDescription(type, data) ?? null,
      metadata: data as any,
      occurredAt: new Date()
    }
  });
}

async function processEntry(entryId: string, fields: string[]): Promise<void> {
  const parsed = parseEntry(fields);
  if (!parsed) {
    warn(`Entrada inválida ignorada: ${entryId}`);
    return;
  }

  const { type, orderId, data } = parsed;

  log(`[evento] type=${type} order=${orderId}`);

  if (type === 'SERVICE_ORDER_CREATED') {
    log(`[ordem=${orderId}] status=CREATED — evento de criação salvo`);
    await saveEvent(type, orderId, data);
    return;
  }

  const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
  if (!order) {
    warn(`[ordem=${orderId}] não encontrada no banco, ignorando ${type}`);
    return;
  }

  const currentStatus = order.status as string;
  log(`[ordem=${orderId}] estado_atual=${currentStatus}`);

  if (isTerminal(currentStatus)) {
    log(`[ordem=${orderId}] estado_atual=${currentStatus} (terminal) — ignorando ${type}`);
    return;
  }

  const result = validateTransition(currentStatus, type, data);
  if (!result.allowed || !result.newStatus) {
    warn(`[ordem=${orderId}] transição inválida: ${currentStatus} --(${type})→ ?`);
    return;
  }

  const newStatus = result.newStatus as ServiceOrderStatus;

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === ServiceOrderStatus.COMPLETED) {
    updateData.completedAt = new Date();
  }
  if (newStatus === ServiceOrderStatus.CANCELLED) {
    updateData.cancelledAt = new Date();
  }

  await prisma.serviceOrder.update({
    where: { id: orderId },
    data: updateData as any
  });

  await saveEvent(type, orderId, data);

  log(`[ordem=${orderId}] transição: ${currentStatus} → ${newStatus} via ${type}`);
}

async function readHistory(): Promise<void> {
  log('Reidratando eventos do stream...');
  let lastId = '0-0';
  let count = 0;
  for (;;) {
    const results: any = await redis.xreadgroup(
      'GROUP', GROUP, CONSUMER,
      'COUNT', 100,
      'BLOCK', 2000,
      'STREAMS', STREAM_KEY,
      lastId
    );

    if (!results) break;

    const entries = results[0][1];
    if (!entries || entries.length === 0) break;

    log(`[batch] lote com ${entries.length} evento(s)`);

    for (const [entryId, fields] of entries) {
      await processEntry(entryId, fields);
      count++;
    }

    const lastEntry = entries[entries.length - 1];
    lastId = lastEntry[0];
  }
  log(`Reidratação concluída: ${count} eventos processados.`);
}

async function listenLoop(): Promise<void> {
  log('Iniciando loop de escuta de novos eventos...');
  for (;;) {
    const results: any = await redis.xreadgroup(
      'GROUP', GROUP, CONSUMER,
      'COUNT', 10,
      'BLOCK', 5000,
      'STREAMS', STREAM_KEY,
      '>'
    );

    if (results) {
      for (const [, entries] of results) {
        log(`[batch] ${entries.length} novo(s) evento(s) recebido(s)`);
        for (const [entryId, fields] of entries) {
          await processEntry(entryId, fields);
        }
      }
    }
  }
}

async function main(): Promise<void> {
  log('Iniciando State Machine Service...');
  await initStream();
  await readHistory();
  listenLoop().catch((err) => {
    console.error('[ordem-servico-state-manager] Erro no loop de eventos:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('[ordem-servico-state-manager] Erro ao inicializar:', err);
  process.exit(1);
});
