import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

import type { DatabaseSettings } from '../config/env.validation.js';
import { EventEntity } from '../events/event.entity.js';
import { MapEntity } from '../maps/map.entity.js';
import { PathEntity } from '../paths/path.entity.js';
import { CreateEventsAndMaps1730000000000 } from './migrations/1730000000000-CreateEventsAndMaps.js';
import { CreatePaths1730000001000 } from './migrations/1730000001000-CreatePaths.js';

/**
 * Entidades e migrações ficam declaradas aqui, e não só via `autoLoadEntities`,
 * porque o runner de migrações (`data-source.ts`) precisa da lista completa sem
 * passar pelo ciclo de vida do Nest. `autoLoadEntities` continua ligado para que
 * os módulos registrem entidades novas com `forFeature`.
 */
export const entities = [EventEntity, MapEntity, PathEntity];

export const migrations = [
  CreateEventsAndMaps1730000000000,
  CreatePaths1730000001000,
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
