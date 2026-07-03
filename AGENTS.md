# PitTrack — AGENTS.md

## Stack
- **Runtime:** Node.js + Express, TypeScript via `tsx`
- **State machine / workers:** JS legado em `src-legacy/` (não mecha sem orientação)
- **Banco:** PostgreSQL init em `infra/postgres/init.sql`
- **Eventos:** Redis Streams (`pittrack:events`) + Pub/Sub (`live-notifications`)
- **Frontend:** React + Vite + Socket.IO Client
- **Infra:** Docker Compose

## Comandos essenciais
```bash
docker compose up --build          # sobe tudo (precisa .env)
npx tsc --noEmit                   # typecheck ordem-servico-api
npm start                          # dev: executa server.ts via tsx (precisa PG + Redis)
```

## Docker
- **ordem-servico-api/Dockerfile** — instala todas as deps (incluindo `tsx`), roda `prisma generate` no build e `prisma migrate deploy` no startup
- **docker-compose.yml** — serviços: `redis`, `postgres`, `ordem-servico-api`, `frontend` (workers legados removidos)
- Migrações Prisma em `prisma/migrations/`

## Arquitetura ordem-servico-api (`src/`)
```
routes/          ← Express routers (1 por contexto, classes com build())
domain/
  types/         ← enums (string enums: ServiceOrderStatus, BudgetStatus, etc.)
  models/        ← interfaces de dados (ServiceOrder, CustomerSnapshot, etc.)
  repositories/  ← interfaces (ServiceOrderRepository, TimelineCacheRepository)
  clients/       ← interfaces HTTP externas (TimelineProjectionClient)
  events/        ← interface do event publisher (ServiceOrderEventPublisher)
  use-cases/     ← classes de negócio (1 por contexto, DI via construtor)
infra/
  repositories/  ← implementações Prisma (ServiceOrderRepositoryPrisma)
  events/        ← implementações Redis (ServiceOrderEventPublisherRedis)
  clients/       ← implementações HTTP (TimelineProjectionClientHttp)
  database/      ← PrismaClient singleton
```

## Convenções
- **Import paths:** relativos (ex: `../../types/service-order-status`)
- **DI:** construtor com `private readonly dep: Interface`
- **Eventos:** cada use-case publica evento no Redis Stream; o estado é persistido pelo ordem-servico-state-manager
- **Status:** transitam via `updateStatus()` + evento `STATUS_UPDATED`; state machine em outro serviço
- **Timeline:** cache-first (Redis) → fallback HTTP para serviço de projeção
- **Rotas:** classe por contexto com método `build(): Router`, prefixo `/orders`
- **IDs req.param:** usar `paramId(req)` (de `routes/utils.ts`) por causa do tipo Express

## Branch
- Atual: `os-api-impl`

## Serviços e portas
| Serviço | Porta |
|---|---|
| API | 3001 |
| Frontend | 5173 |
| PostgreSQL | 5432 |
| Redis | 6379 |
