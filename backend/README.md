# accessevent-api

API REST do **AccessEvent** — NestJS + PostgreSQL (TypeORM).

## Requisitos

- Node.js 24
- Docker (opcional, para subir o PostgreSQL)

## Configuração

Copie o arquivo de exemplo e ajuste se necessário:

```bash
cp .env.example .env
```

A aplicação **aborta na inicialização** se alguma variável de ambiente for inválida
(a validação está em `src/config/env.validation.ts`).

| Variável              | Default         | Descrição                                  |
| --------------------- | --------------- | ------------------------------------------ |
| `PORT`                | `3333`          | Porta da API                               |
| `NODE_ENV`            | `development`   | `development` \| `staging` \| `production` \| `test` |
| `DATABASE_HOST`       | `localhost`     | Host do PostgreSQL                         |
| `DATABASE_PORT`       | `5432`          | Porta do PostgreSQL                        |
| `DATABASE_USERNAME`   | `accessevent`   | Usuário do banco                           |
| `DATABASE_PASSWORD`   | `accessevent`   | Senha do banco                             |
| `DATABASE_NAME`       | `accessevent`   | Nome do banco                              |
| `DATABASE_SCHEMA`     | `public`        | Schema do TypeORM                          |
| `DATABASE_SSL`        | `false`         | Habilita TLS na conexão                    |
| `DATABASE_LOGGING`    | `false`         | Loga as queries do TypeORM                 |
| `CORS_ORIGINS`        | `*`             | Origens permitidas, separadas por vírgula  |

## Comandos

```bash
npm install
npm run start:dev      # watch mode
npm run build          # compila para dist/
npm run start:prod     # executa dist/main.js

npm run lint           # oxlint
npm run typecheck      # tsc --noEmit
npm run format         # prettier --write

npm run test           # unitários (vitest)
npm run test:e2e       # e2e de /health (vitest)
npm run test:cov       # cobertura
```

## Banco de dados

```bash
# sobe apenas o PostgreSQL a partir da raiz do repositório
docker compose up -d postgres
```

## Endpoints

### `GET /health`

Responde `200` quando o PostgreSQL responde e `503` quando não responde.
O corpo é o mesmo nos dois casos, o que permite ao app identificar qual
componente está fora do ar.

```json
{
  "status": "ok",
  "service": "accessevent-api",
  "version": "0.0.1",
  "environment": "production",
  "database": { "status": "up", "latencyMs": 15.88 },
  "timestamp": "2026-09-28T21:10:05.724Z"
}
```

## Convenções

- **Node ESM** (`"type": "module"`): imports relativos exigem a extensão `.js`.
- Identificadores, colunas e respostas da API em **inglês**; mensagens voltadas ao
  usuário em **pt-BR**.
- `synchronize` do TypeORM está desligado de propósito — migrações viram explícitas.
