import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

import type { DatabaseSettings } from '../config/env.validation.js';
import { EventEntity } from '../events/event.entity.js';
import { MapEntity } from '../maps/map.entity.js';
import { PathEntity } from '../paths/path.entity.js';
import { UserEntity } from '../users/user.entity.js';
import { PoiEntity } from '../pois/poi.entity.js';
import { CreateEventsAndMaps1730000000000 } from './migrations/1730000000000-CreateEventsAndMaps.js';
import { CreatePaths1730000001000 } from './migrations/1730000001000-CreatePaths.js';
import { AddEventCategory1730000002000 } from './migrations/1730000002000-AddEventCategory.js';
import { CreateUsers1730000003000 } from './migrations/1730000003000-CreateUsers.js';
import { AddPathName1730000004000 } from './migrations/1730000004000-AddPathName.js';
import { CreatePointsOfInterest1730000005000 } from './migrations/1730000005000-CreatePointsOfInterest.js';
import { AddPoiRect1730000006000 } from './migrations/1730000006000-AddPoiRect.js';
import { MakeUserBirthDateOptional1730000007000 } from './migrations/1730000007000-MakeUserBirthDateOptional.js';

/**
 * Entidades e migrações ficam declaradas aqui, e não só via `autoLoadEntities`,
 * porque o runner de migrações (`data-source.ts`) precisa da lista completa sem
 * passar pelo ciclo de vida do Nest. `autoLoadEntities` continua ligado para que
 * os módulos registrem entidades novas com `forFeature`.
 *
 * **Esta lista é a porta de entrada das migrações, e ela é manual.** Um arquivo
 * novo em `migrations/` que não entrar aqui compila, passa no typecheck e no lint
 * e mesmo assim nunca roda: o TypeORM só conhece o que está neste array, então
 * `show` responde "Banco atualizado" e `run` não aplica nada, sem erro. Ao criar
 * uma migração, registre-a aqui — foi o que aconteceu com `AddPathName`, que só
 * apareceu quando a coluna foi conferida no Postgres de verdade.
 */
export const entities = [
  EventEntity,
  MapEntity,
  PathEntity,
  UserEntity,
  PoiEntity,
];

export const migrations = [
  CreateEventsAndMaps1730000000000,
  CreatePaths1730000001000,
  AddEventCategory1730000002000,
  CreateUsers1730000003000,
  AddPathName1730000004000,
  CreatePointsOfInterest1730000005000,
  AddPoiRect1730000006000,
  MakeUserBirthDateOptional1730000007000,
];

/**
 * Opções do TypeORM compartilhadas pela aplicação (`AppModule`) e pelo runner de
 * migrações (`data-source.ts`). O tipo é a interseção das duas APIs porque
 * `autoLoadEntities` só existe no módulo do Nest, enquanto `type` é obrigatório
 * no `DataSource`. `synchronize` fica desligado de propósito: o schema do banco
 * só muda por migração versionada.
 */
export function buildTypeOrmOptions(
  database: DatabaseSettings,
): TypeOrmModuleOptions & DataSourceOptions {
  return {
    type: 'postgres',
    /**
     * `gen_random_uuid()` é nativo do PostgreSQL 13+, então o id não depende da
     * extensão `uuid-ossp` (que exigiria superusuário). Em bancos gerenciados
     * sem permissão de `CREATE EXTENSION` o driver apenas avisa no log.
     */
    uuidExtension: 'pgcrypto',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.name,
    schema: database.schema,
    ssl: database.ssl ? { rejectUnauthorized: false } : false,
    logging: database.logging,
    entities,
    migrations,
    autoLoadEntities: true,
    synchronize: false,
    retryAttempts: 5,
    retryDelay: 2000,
  };
}
