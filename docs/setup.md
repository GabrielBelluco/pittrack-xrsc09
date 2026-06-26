# Setup do PitTrack

## Pré-requisitos

- Docker Desktop ou Docker Engine com Docker Compose.
- Portas livres: `3001`, `5173`, `5432`, `6379`.

## Configuração

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Se o Docker da máquina disponibilizar apenas o comando legado:

```powershell
docker-compose up --build
```

No Linux/macOS:

```bash
cp .env.example .env
docker compose up --build
```

## Endereços

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Health check: http://localhost:3001/health
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Teste rápido da API

Criar uma ordem:

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d "{\"customer\":{\"name\":\"Cliente Demo\"},\"vehicle\":{\"plate\":\"PTK-2026\",\"model\":\"Hatch 1.6\"},\"complaint\":\"Ruído ao frear\"}"
```

Listar ordens:

```bash
curl http://localhost:3001/orders
```

Gerar orçamento:

```bash
curl -X POST http://localhost:3001/orders/1/budget \
  -H "Content-Type: application/json" \
  -d "{\"description\":\"Troca de pastilhas e teste final\",\"amount\":890}"
```

Aprovar orçamento:

```bash
curl -X POST http://localhost:3001/orders/1/approve-budget \
  -H "Content-Type: application/json" \
  -d "{}"
```

Registrar peça:

```bash
curl -X POST http://localhost:3001/orders/1/parts \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Pastilha de freio\",\"quantity\":1}"
```

Registrar vídeo:

```bash
curl -X POST http://localhost:3001/orders/1/videos \
  -H "Content-Type: application/json" \
  -d "{\"step\":\"Diagnóstico\",\"type\":\"video\",\"url\":\"https://example.com/video.mp4\",\"description\":\"Ruído identificado\"}"
```

## Logs úteis

Ver a troca de mensagens entre API e workers:

```bash
docker compose logs -f backend diagnostic-worker parts-worker repair-worker notification-worker
```

Ver apenas Redis e banco:

```bash
docker compose logs -f redis postgres
```

Inspecionar o stream no Redis:

```bash
docker compose exec redis redis-cli XRANGE pittrack:events - +
```

Inspecionar notificações Pub/Sub ao vivo:

```bash
docker compose exec redis redis-cli SUBSCRIBE live-notifications
```

## Roteiro de demonstração em sala

1. Subir o ambiente com `docker compose up --build`.
2. Abrir http://localhost:5173.
3. Abrir os logs dos workers em outro terminal.
4. Clicar em `Criar ordem exemplo`.
5. Mostrar no log o `SERVICE_ORDER_CREATED` entrando no Redis Streams.
6. Mostrar o `diagnostic-worker` iniciando e concluindo o diagnóstico.
7. Clicar em `Gerar orçamento` e depois `Aprovar`.
8. Mostrar o `repair-worker` executando reparo, testes finais e finalização.
9. Clicar em `Registrar peça` para acionar o `parts-worker`.
10. Clicar em `Registrar vídeo` para demonstrar mídia por etapa.
11. Apontar no painel de eventos que o frontend não consulta repetidamente a API para notificações: ele recebe via Socket.IO após Pub/Sub.
