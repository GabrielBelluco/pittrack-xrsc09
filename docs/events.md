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
| `DIAGNOSIS_STARTED` | API | notification-worker | Indica início manual do diagnóstico. |
| `DIAGNOSIS_FINISHED` | API | notification-worker | Indica fim do diagnóstico ao gerar orçamento. |
| `BUDGET_CREATED` | API | notification-worker | Indica orçamento criado e aguardando aprovação. |
| `BUDGET_APPROVED` | API | repair-worker, notification-worker | Libera o reparo. |
| `PART_RESERVED` | API | parts-worker, notification-worker | Indica registro de peça para reserva/rastreio. |
| `PART_TRACKING_UPDATED` | parts-worker | notification-worker | Indica peça reservada com código de rastreio. |
| `PART_REPLACED` | API | notification-worker | Indica substituição manual de peça. |
| `MEDIA_UPLOADED` | API | notification-worker | Indica upload real de foto ou vídeo por etapa. |
| `VIDEO_UPLOADED` | API | notification-worker | Compatibilidade para registro por URL/metadados. |
| `LIVE_STARTED` | API | notification-worker | Indica início de uma transmissão ao vivo. |
| `LIVE_ENDED` | API | notification-worker | Indica encerramento de uma transmissão ao vivo. |
| `REPAIR_STARTED` | API | notification-worker | Indica início manual do reparo. |
| `FINAL_TEST_STARTED` | API | notification-worker | Indica início manual dos testes finais. |
| `MAINTENANCE_FINISHED` | API | notification-worker | Indica conclusão manual da manutenção. |

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
2. `diagnostic-worker` consome o evento e registra em log que aguarda ação manual da oficina.
3. `POST /orders/:id/status` publica eventos manuais como `DIAGNOSIS_STARTED`, `REPAIR_STARTED`, `FINAL_TEST_STARTED` e `MAINTENANCE_FINISHED`.
4. `POST /orders/:id/budget` publica `DIAGNOSIS_FINISHED` e `BUDGET_CREATED`.
5. `POST /orders/:id/approve-budget` publica `BUDGET_APPROVED`.
6. `repair-worker` consome a aprovação e registra em log que o reparo está liberado, mas não avança a ordem automaticamente.
7. `POST /orders/:id/parts` publica `PART_RESERVED`.
8. `parts-worker` consome o evento, registra rastreio e publica `PART_TRACKING_UPDATED`.
9. `POST /orders/:id/parts/:partId/replace` publica `PART_REPLACED`.
10. `POST /orders/:id/media` publica `MEDIA_UPLOADED` com arquivo real salvo em `uploads/`.
11. `POST /orders/:id/live/start` e `/live/end` publicam `LIVE_STARTED` e `LIVE_ENDED`.
12. `notification-worker` publica todos esses eventos no Pub/Sub.
13. A API recebe o Pub/Sub e envia ao frontend por Socket.IO.

## Sinalização da live

A transmissão ao vivo usa WebRTC entre navegadores. O Socket.IO não carrega o vídeo; ele apenas coordena a conexão:

| Evento Socket.IO | Função |
| --- | --- |
| `live-join` | Entra na sala da ordem como oficina ou cliente. |
| `live-peer-joined` | Avisa que outro navegador entrou na live. |
| `live-offer` | Envia a oferta WebRTC da oficina para o cliente. |
| `live-answer` | Envia a resposta WebRTC do cliente para a oficina. |
| `live-ice-candidate` | Troca candidatos ICE para conexão WebRTC. |
| `live-leave` | Sai da sala de live. |
