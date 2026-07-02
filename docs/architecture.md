# Arquitetura do PitTrack

## Problema de negócio

Oficinas pequenas e médias costumam acompanhar manutenções por ligações, mensagens informais e anotações locais. Isso cria três problemas recorrentes:

- o cliente não sabe em que etapa o veículo está;
- a oficina perde rastreabilidade sobre orçamento, peças, evidências e responsáveis;
- o atendimento depende de interrupções manuais para informar cada atualização.

O PitTrack propõe uma plataforma leve para registrar ordens de serviço e publicar atualizações em tempo real. O valor de negócio está na transparência operacional: o cliente acompanha diagnóstico, orçamento, peças, reparo, testes finais e registros visuais sem precisar acionar a oficina a todo momento.

## Escopo do protótipo

O protótipo prioriza os conceitos de Sistemas Distribuídos:

- processos independentes para API e workers;
- Redis Streams como log de eventos importantes;
- Redis Pub/Sub para notificações ao vivo;
- PostgreSQL para persistência relacional;
- Socket.IO para entregar atualizações ao navegador;
- upload real de fotos/vídeos por etapa;
- live WebRTC entre oficina e cliente;
- logs explícitos para demonstrar troca de mensagens.

Autenticação e gestão financeira completa não fazem parte desta primeira versão.

## Visão geral

```mermaid
flowchart LR
  Browser["Frontend React"] -->|"HTTP REST"| API["API Node.js / Express"]
  Browser <-->|"Socket.IO"| API
  Browser <-->|"WebRTC live"| Client["Outro navegador"]
  API -->|"INSERT/UPDATE/SELECT"| PG["PostgreSQL"]
  API -->|"salva arquivos"| Uploads["uploads/"]
  API -->|"XADD"| Stream["Redis Streams<br/>pittrack:events"]
  Stream -->|"XREADGROUP"| Diagnostic["diagnostic-worker"]
  Stream -->|"XREADGROUP"| Parts["parts-worker"]
  Stream -->|"XREADGROUP"| Repair["repair-worker"]
  Stream -->|"XREADGROUP"| Notify["notification-worker"]
  Parts -->|"XADD"| Stream
  Parts -->|"UPDATE parts"| PG
  Notify -->|"PUBLISH live-notifications"| PubSub["Redis Pub/Sub"]
  PubSub -->|"SUBSCRIBE"| API
  API -->|"emit order-event"| Browser
```

## Componentes

### Frontend

Aplicação React com Vite. Ela possui duas visões:

- `/oficina`: tela operacional usada pelo mecânico/atendente para avançar etapas, enviar mídia e iniciar live.
- `/cliente/:id`: tela do cliente para acompanhar status, aprovar orçamento, ver mídias e entrar na live.

As duas visões consultam a API por HTTP e mantêm conexão Socket.IO para receber eventos em tempo real.

### Backend/API

Aplicação Node.js com Express. Responsável por:

- receber comandos HTTP;
- persistir dados permanentes no PostgreSQL;
- publicar eventos de negócio no Redis Streams;
- assinar o canal Pub/Sub `live-notifications`;
- repassar notificações aos clientes conectados por Socket.IO.

### PostgreSQL

Banco relacional usado para estado permanente:

- clientes;
- veículos;
- ordens de serviço;
- histórico de status;
- orçamentos;
- peças;
- substituições;
- mídias registradas.
- sessões de live.

### Redis Streams

Middleware de eventos persistente. A API e os workers publicam eventos usando `XADD`; os workers consomem com grupos independentes via `XREADGROUP`.

Cada worker possui seu próprio consumer group para que todos possam observar o mesmo stream sem competir entre si.

### Uploads

Arquivos reais de foto e vídeo são recebidos por `POST /orders/:id/media`, salvos em `backend/uploads` e registrados em `media_records`.

### Live WebRTC

A live usa WebRTC para enviar áudio/vídeo diretamente entre navegadores. A API não transporta o vídeo; ela usa Socket.IO apenas para sinalização (`offer`, `answer` e `ICE candidates`) e registra `LIVE_STARTED`/`LIVE_ENDED` como eventos de negócio.

### Redis Pub/Sub

Canal de entrega ao vivo. O `notification-worker` transforma eventos do stream em mensagens publicadas no canal `live-notifications`. A API assina esse canal e envia as mensagens ao frontend.

### Workers

- `diagnostic-worker`: reage a `SERVICE_ORDER_CREATED` e registra que o diagnóstico aguarda ação manual da oficina.
- `parts-worker`: reage a `PART_RESERVED`, simula rastreio/reserva de peça e publica `PART_TRACKING_UPDATED`.
- `repair-worker`: reage a `BUDGET_APPROVED` e registra que o reparo está liberado, sem avançar automaticamente.
- `notification-worker`: escuta todos os eventos e publica notificações via Redis Pub/Sub.

## Fluxo principal

```mermaid
sequenceDiagram
  participant U as Usuário
  participant F as Frontend
  participant A as API
  participant DB as PostgreSQL
  participant R as Redis Streams
  participant W as Workers
  participant N as notification-worker
  participant PS as Redis Pub/Sub

  U->>F: Criar ordem exemplo
  F->>A: POST /orders
  A->>DB: Salva cliente, veículo, ordem e status inicial
  A->>R: XADD SERVICE_ORDER_CREATED
  W->>R: XREADGROUP e logs de apoio distribuído
  U->>F: Avança etapa manualmente
  F->>A: POST /orders/:id/status
  A->>DB: Atualiza status e timeline
  A->>R: XADD evento da etapa
  N->>R: XREADGROUP
  N->>PS: PUBLISH live-notifications
  A->>PS: SUBSCRIBE live-notifications
  A->>F: Socket.IO order-event
```

## Modelo de negócio

O sistema atende oficinas que precisam melhorar a comunicação sem adotar um ERP complexo. O produto poderia ser oferecido como assinatura mensal simples para oficinas, com limites por número de ordens ativas, armazenamento de mídia e usuários internos.

Benefícios para a oficina:

- menos ligações repetitivas sobre andamento;
- histórico centralizado da manutenção;
- evidências visuais do serviço executado;
- rastreio de peças e orçamento em um único fluxo;
- live pontual para explicar diagnóstico ou reparo;
- melhoria de confiança com o cliente.

Benefícios para o cliente:

- acompanhamento em tempo real;
- evidências por etapa;
- possibilidade de acompanhar uma live quando a oficina abrir transmissão;
- aprovação de orçamento com contexto;
- histórico consultável do serviço.

## Limitações assumidas

- não há autenticação nesta versão;
- a live WebRTC é ponto a ponto e depende das permissões de câmera/microfone do navegador;
- não há garantia transacional entre PostgreSQL e Redis Streams;
- o frontend é apenas suficiente para demonstrar o fluxo distribuído.
