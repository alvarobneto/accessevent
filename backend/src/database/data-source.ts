import { config as loadEnvFile } from 'dotenv';
import { DataSource } from 'typeorm';

import { validateConfig } from '../config/env.validation.js';
import { buildTypeOrmOptions } from './typeorm.options.js';

/**
 * `ConfigModule` carrega o `.env` quando o Nest sobe, mas o runner de migrações
 * roda fora do Nest — por isso o `dotenv` é chamado aqui. A ordem espelha o
 * `envFilePath` do `ConfigModule`: `.env.local` tem precedência sobre `.env`.
 */
loadEnvFile({ path: ['.env.local', '.env'] });

/**
 * Export único e nomeado de propósito: o CLI do TypeORM (`migration:generate -d …`)
 * exige um arquivo de DataSource com **exatamente uma** exportação de instância, e
 * um `export default` apontando para a mesma instância faz a contagem passar de 1 e
 * ele abortar. Quem precisar do DataSource importa `{ appDataSource }`.
 */
export const appDataSource = new DataSource(
  buildTypeOrmOptions(validateConfig(process.env).database),
);
