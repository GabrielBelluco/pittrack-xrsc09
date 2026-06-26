# Eventos do PitTrack

## Stream principal

- Chave Redis: `pittrack:events`
- Publicação: `XADD pittrack:events * ...`
- Consumo: `XREADGROUP`

Payload gravado no campo `payload`:

```json
{
  "type": "SERVICE_ORDER_CREATED",
  "source": "api",
  "orderId": 1,
  "payload": {
    "orderId": 1,
    "status": "Aguardando Atendimento",
    "message": "Ordem #1 criada para PTK-2026."
  },
  "message": "Ordem #1 criada para PTK-2026.",
  "timestamp": "2026-06-09T12:00:00.000Z"
}
```

## Canal Pub/Sub

- Canal Redis: `live-notifications`
- Publicador: `notification-worker`
- Assinante: API
- Entrega final: Socket.IO no evento `order-event`

## Eventos principais

| Evento | Origem | Consumidores relevantes | Função |
| --- | --- | --- | --- |
| `SERVICE_ORDER_CREATED` | API | diagnostic-worker, notification-worker | Indica abertura de uma ordem de serviço. |
| `STATUS_UPDATED` | API | notification-worker | Indica alteração manual de status. |
| `DIAGNOSIS_STARTED` | diagnostic-worker | notification-worker | Indica início do diagnóstico. |
| `DIAGNOSIS_FINISHED` | diagnostic-worker | notification-worker | Indica fim do diagnóstico. |
| `BUDGET_CREATED` | API | notification-worker | Indica orçamento criado e aguardando aprovação. |
| `BUDGET_APPROVED` | API | repair-worker, notification-worker | Libera o reparo. |
| `PART_RESERVED` | API | parts-worker, notification-worker | Indica registro de peça para reserva/rastreio. |
| `PART_REPLACED` | parts-worker | notification-worker | Indica substituição de peça. |
| `VIDEO_UPLOADED` | API | notification-worker | Indica registro de mídia por etapa. |
| `REPAIR_STARTED` | repair-worker | notification-worker | Indica início do reparo. |
| `FINAL_TEST_STARTED` | repair-worker | notification-worker | Indica início dos testes finais. |
| `MAINTENANCE_FINISHED` | repair-worker | notification-worker | Indica conclusão da manutenção. |

## Consumer groups

Cada worker lê o mesmo stream com um grupo próprio:

| Worker | Consumer group |
| --- | --- |
| diagnostic-worker | `diagnostic-workers` |
| parts-worker | `parts-workers` |
| repair-worker | `repair-workers` |
| notification-worker | `notification-workers` |

Isso permite demonstrar processos independentes observando o mesmo middleware de eventos.

## Fluxo demonstrável

1. `POST /orders` publica `SERVICE_ORDER_CREATED`.
2. `diagnostic-worker` consome o evento, atualiza a ordem para `Em Diagnóstico` e publica eventos de diagnóstico.
3. `POST /orders/:id/budget` publica `BUDGET_CREATED`.
4. `POST /orders/:id/approve-budget` publica `BUDGET_APPROVED`.
5. `repair-worker` consome a aprovação e publica eventos de reparo, testes e finalização.
6. `POST /orders/:id/parts` publica `PART_RESERVED`.
7. `parts-worker` consome o evento, registra rastreio e publica `PART_REPLACED`.
8. `POST /orders/:id/videos` publica `VIDEO_UPLOADED`.
9. `notification-worker` publica todos esses eventos no Pub/Sub.
10. A API recebe o Pub/Sub e envia ao frontend por Socket.IO.
