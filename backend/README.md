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
npm run test:e2e       # e2e de /health, /events e /maps (vitest)
npm run test:cov       # cobertura

npm run migration:run     # aplica as migrações pendentes
npm run migration:show    # lista as migrações e o que falta
npm run migration:revert  # reverte a última migração aplicada
```

## Banco de dados

O banco é gerenciado pelo **`docker-compose.yml` da raiz do repositório**, que
também roda a API e as migrações. Não existe um compose só com o Postgres dentro
de `backend/`: os dois arquivos declaravam um container de mesmo nome
(`accessevent-postgres`), e o da raiz não subia por causa do conflito de nome. O
volume do Postgres é gerenciado por esse compose da raiz.

```bash
# a partir da raiz do repositório
docker compose up -d postgres   # só o banco
docker compose up -d --build    # banco + migrações + API
```

O `docker compose` encontra o arquivo da raiz mesmo quando o comando roda de
dentro de `backend/`, porque o Compose sobe os diretórios até achar o compose.

### Migrações

O `synchronize` do TypeORM está desligado, então o schema do banco só muda por
migração versionada, em `src/database/migrations/`.

```bash
npm run migration:run
```

Para gerar a próxima, acrescente a entidade, ajuste `src/database/typeorm.options.ts`
e rode o CLI do TypeORM **contra o DataSource compilado** (o projeto é ESM e não tem
`ts-node`, então `-d src/database/data-source.ts` não resolve):

```bash
npm run build
npx typeorm migration:generate src/database/migrations/NomeDaMudanca \
  -d dist/database/data-source.js
```

**A lista em `typeorm.options.ts` é manual, e esquecê-la não dá erro.** O array
`migrations` é a única coisa que o TypeORM conhece: um arquivo novo em
`migrations/` que não for importado e adicionado ao array compila, passa no
typecheck e no lint, e mesmo assim nunca roda — `migration:show` responde "Banco
atualizado", `migration:run` responde "Banco já estava atualizado" e a coluna
simplesmente não existe. Foi o que aconteceu com `AddPathName`, e só o `\d paths`
no Postgres revelou. Registre a migração no array antes de rodar.

O CLI exige que o arquivo do DataSource tenha **exatamente uma** exportação de
instância — é por isso que `data-source.ts` exporta só `appDataSource`, sem `export
default` ao lado. Se você acrescentar outro export exportado nesse arquivo, o
`migration:generate` aborta com *"must contain only one export of DataSource instance"*.

Depois confira o SQL gerado. Um teste rápido de que a migração e as entidades
concordam é pedir o diff ao schema builder — a lista precisa vir vazia:

```bash
node --input-type=module -e "
const { appDataSource } = await import('./dist/database/data-source.js');
await appDataSource.initialize();
const sql = await appDataSource.driver.createSchemaBuilder().log();
console.log(sql.upQueries.length === 0 ? 'sem divergencia' : sql.upQueries.map((q) => q.query));
await appDataSource.destroy();
"
```

No Docker, `docker compose up` já executa as migrações: o serviço `migrate` roda
`node dist/database/migrate.js run` e o serviço `api` só sobe depois que ele
termina com sucesso. O runner é o JavaScript compilado porque a imagem de runtime
remove as devDependencies, e o CLI do TypeORM exigiria `ts-node`.

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

### Eventos

`Event` do PRD §23. Só o `name` é obrigatório; `description`, `address`,
`startDate` e `endDate` são opcionais. As datas vão e voltam em `YYYY-MM-DD`.

| Método   | Rota            | Corpo                                        |
| -------- | --------------- | -------------------------------------------- |
| `GET`    | `/events`       | — (devolve a lista em ordem alfabética)      |
| `GET`    | `/events/:id`   | —                                            |
| `POST`   | `/events`       | `CreateEventDto` → `201`                     |
| `PATCH`  | `/events/:id`   | `UpdateEventDto` (apenas os campos enviados) |

Não há `DELETE`: a remoção de evento não faz parte do escopo do MVP.

```json
{
  "id": "b1703e32-dff0-4367-bb2d-2192057efc5d",
  "name": "Congresso Acessível",
  "description": "Pavilhões A e B",
  "address": "São Paulo, SP",
  "startDate": "2026-10-05",
  "endDate": "2026-10-08",
  "createdAt": "2026-09-30T22:45:12.145Z",
  "updatedAt": "2026-09-30T22:45:12.145Z"
}
```

`organizerId` e `imageUrl` ficam de fora: o primeiro depende de `User` (RF01, com
autenticação) e o segundo de storage, que o MVP não tem.

### Navegações

`Map` do PRD §23 — um mapa por evento, que vira o grafo de POIs e caminhos a
partir da Sprint 6. O `state` (`DRAFT`/`PUBLISHED`/`ARCHIVED`) chega na Sprint 19,
junto da publicação.

| Método  | Rota                          | Corpo                    |
| ------- | ----------------------------- | ------------------------ |
| `GET`   | `/events/:eventId/maps`       | —                        |
| `POST`  | `/events/:eventId/maps`       | `CreateMapDto` → `201`   |
| `GET`   | `/maps/:mapId`                | —                        |
| `PATCH` | `/maps/:mapId`                | `UpdateMapDto`           |

`eventId` vem do caminho, e não do corpo: mandá-lo no `POST` é rejeitado com `400`.
Apagar o evento apaga as navegações dele (`ON DELETE CASCADE`).

### Caminhos

`Path` do PRD §23 — o trajeto que o organizador percorreu. Os nós de ponta
(`startNodeId`/`endNodeId`) e os atributos de acessibilidade chegam na Sprint 9;
hoje o que existe é a geometria gravada, a distância que a API deriva dela e o
nome que o organizador dá depois.

| Método  | Rota                    | Corpo                                        |
| ------- | ----------------------- | -------------------------------------------- |
| `GET`   | `/maps/:mapId/paths`    | —                                            |
| `POST`  | `/maps/:mapId/paths`    | `geometry` → `201`                           |
| `GET`   | `/paths/:pathId`        | —                                            |
| `PATCH` | `/paths/:pathId`        | `UpdatePathDto` (apenas `name`)              |
| `DELETE`| `/paths/:pathId`        | —                                            |

Três decisões do `PATCH /paths/:pathId`:

- **Só `name`.** `geometry`, `distance`, `mapId` e os nós de ponta não fazem parte
  do recurso: mandá-los volta `400` pelo `forbidNonWhitelisted`, e não são
  ignorados em silêncio — quem acha que reposicionou o trajeto precisa ver o erro.
- **Corpo `{}` é no-op.** Não dá para "limpar" o nome, e não há `name: null` no
  `UpdatePathDto`: um caminho sem nome é o estado em que ele foi gravado, não um
  estado a que se volta. `updatedAt` não é tocado quando nada muda, para a lista não
  reordenar por causa de um `PATCH` que não salvou nada.
- **`name` é gravado aparado e tem 120 caracteres**, pela regra de `IsBoundedName` —
  o mesmo validador de `CreateMapDto` e do evento, em vez de uma quarta cópia da
  mesma checagem.

## Convenções

- **Node ESM** (`"type": "module"`): imports relativos exigem a extensão `.js`.
- Identificadores, colunas e respostas da API em **inglês**; mensagens voltadas ao
  usuário em **pt-BR**. As regras de validação escrevem a própria mensagem em
  pt-BR (`@MaxLength(120, { message: '...' })`), então o app mostra o erro do
  servidor sem tradução.
- **A única mensagem que o DTO não escreve é a de campo fora do contrato**, porque ela
  não vem do DTO: o `forbidNonWhitelisted` do `ValidationPipe` gera
  `property distance should not exist`, em inglês. O `exceptionFactory` em
  `src/app.setup.ts` troca por `O campo "distance" não faz parte deste recurso.` — o
  app mostra a frase do corpo (`ApiError` no mobile), e o erro é de cliente, mas quem
  lê é o organizador. A tradução fica no pipe global porque a regra é global: tratar
  por endpoint deixaria a mesma classe de erro com dois comportamentos.
- `synchronize` do TypeORM está desligado de propósito — migrações viram explícitas.
- `configureApp` em `src/app.setup.ts` concentra CORS e `ValidationPipe`. O
  `main.ts` e os testes e2e usam a mesma função, então os `400` cobertos nos testes
  são os que o app recebe na tela.
