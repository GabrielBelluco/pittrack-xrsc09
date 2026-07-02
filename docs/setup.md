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

Enviar foto ou vídeo real:

```bash
curl -X POST http://localhost:3001/orders/1/media \
  -F "step=Diagnóstico" \
  -F "description=Ruído identificado" \
  -F "file=@./video-demo.mp4"
```

Atualizar uma etapa manualmente:

```bash
curl -X POST http://localhost:3001/orders/1/status \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"Em Diagnóstico\",\"note\":\"Diagnóstico iniciado pela oficina\",\"eventType\":\"DIAGNOSIS_STARTED\"}"
```

Iniciar e encerrar uma live:

```bash
curl -X POST http://localhost:3001/orders/1/live/start \
  -H "Content-Type: application/json" \
  -d "{\"startedBy\":\"oficina\"}"

curl -X POST http://localhost:3001/orders/1/live/end \
  -H "Content-Type: application/json" \
  -d "{}"
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
6. Mostrar o `diagnostic-worker` recebendo a ordem, mas aguardando ação manual.
7. Clicar em `Iniciar diagnóstico` e `Finalizar diagnóstico`.
8. Clicar em `Gerar orçamento` e depois `Aprovar orçamento`.
9. Mostrar o `repair-worker` consumindo `BUDGET_APPROVED`, mas aguardando início manual.
10. Clicar em `Iniciar reparo`, `Solicitar peça` e mostrar o `parts-worker` gerando rastreio.
11. Clicar em `Substituir peça`, `Iniciar testes`, `Finalizar serviço`.
12. Enviar uma foto ou vídeo real em `Mídia real`.
13. Iniciar uma live no modo `Oficina` e entrar em outro navegador no modo `Cliente`.
14. Apontar no painel de eventos que o frontend recebe notificações via Socket.IO após Pub/Sub.

## Dois computadores na mesma rede

No computador servidor, descubra o IPv4:

```powershell
ipconfig
```

Exemplo: `192.168.0.25`.

Edite `.env` antes de subir:

```env
VITE_API_URL=http://192.168.0.25:3001
CORS_ORIGIN=http://localhost:5173,http://192.168.0.25:5173
```

Suba:

```powershell
docker compose up --build
```

No segundo computador, abra:

```text
http://192.168.0.25:5173
```

Se não abrir:

- confirme que os dois computadores estão na mesma rede;
- libere as portas `5173` e `3001` no firewall do Windows;
- teste `http://192.168.0.25:3001/health` no segundo computador.

Para live com câmera em dois computadores, o navegador pode bloquear câmera/microfone em HTTP. Opções:

- testar a live em duas abas no mesmo computador usando `localhost`;
- no Chrome, habilitar `chrome://flags/#unsafely-treat-insecure-origin-as-secure` e adicionar `http://192.168.0.25:5173`;
- usar HTTPS/túnel local em uma versão futura.
