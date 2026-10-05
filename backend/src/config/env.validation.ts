import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum AppEnvironment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

export interface DatabaseSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  schema: string;
  ssl: boolean;
  logging: boolean;
}

export interface AppConfig {
  nodeEnv: AppEnvironment;
  port: number;
  corsOrigins: string[];
  database: DatabaseSettings;
}

/** Shape lido do `process.env`, já com os defaults do projeto aplicados. */
class EnvironmentVariables {
  @IsEnum(AppEnvironment)
  @IsOptional()
  NODE_ENV: AppEnvironment = AppEnvironment.Development;

  @IsString()
  @IsOptional()
  PORT = '3333';

  @IsString()
  @IsOptional()
  DATABASE_HOST = 'localhost';

  @IsString()
  @IsOptional()
  DATABASE_PORT = '5432';

  @IsString()
  @IsOptional()
  DATABASE_USERNAME = 'accessevent';

  @IsString()
  @IsOptional()
  DATABASE_PASSWORD = 'accessevent';

  @IsString()
  @IsOptional()
  DATABASE_NAME = 'accessevent';

  @IsString()
  @IsOptional()
  DATABASE_SCHEMA = 'public';

  @IsString()
  @IsOptional()
  DATABASE_SSL = 'false';

  @IsString()
  @IsOptional()
  DATABASE_LOGGING = 'false';

  @IsString()
  @MinLength(1)
  @IsOptional()
  CORS_ORIGINS = '*';

  @IsString()
  @IsOptional()
  JWT_SECRET = 'accessevent-secret-key';
}

function toBoolean(value: string, variableName: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(
    `Configuração de ambiente inválida:\n  - ${variableName} deve ser "true" ou "false".`,
  );
}

function toInteger(value: string, variableName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `Configuração de ambiente inválida:\n  - ${variableName} deve ser um inteiro maior que zero.`,
    );
  }
  return parsed;
}

/**
 * Lê e valida as variáveis de ambiente, devolvendo uma configuração tipada.
 * O processo é abortado na inicialização se algum valor estiver ausente ou inválido.
 */
export function validateConfig(raw: Record<string, unknown>): AppConfig {
  const vars = plainToInstance(
    EnvironmentVariables,
    { ...raw },
    { exposeDefaultValues: true },
  );
  const errors = validateSync(vars);

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(`Configuração de ambiente inválida:\n  - ${details}`);
  }

  return {
    nodeEnv: vars.NODE_ENV,
    port: toInteger(vars.PORT, 'PORT'),
    corsOrigins:
      vars.CORS_ORIGINS === '*'
        ? ['*']
        : vars.CORS_ORIGINS.split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    database: {
      host: vars.DATABASE_HOST,
      port: toInteger(vars.DATABASE_PORT, 'DATABASE_PORT'),
      username: vars.DATABASE_USERNAME,
      password: vars.DATABASE_PASSWORD,
      name: vars.DATABASE_NAME,
      schema: vars.DATABASE_SCHEMA,
      ssl: toBoolean(vars.DATABASE_SSL, 'DATABASE_SSL'),
      logging: toBoolean(vars.DATABASE_LOGGING, 'DATABASE_LOGGING'),
    },
  };
}
