// Configuração centralizada de variáveis de ambiente do app mobile.
//
// O Metro do Expo substitui apenas a forma estática `process.env.NOME_DA_VAR`
// em tempo de build. Por isso as leituras abaixo precisam ser escritas de forma
// literal — o lint `expo/no-dynamic-env-var` impede o uso de `process.env[nome]`.

const DEFAULT_API_URL = 'http://localhost:3333';

/** URL base da API REST do backend NestJS. */
export const apiUrl = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

/** Ambiente em que o app está rodando. */
export const appEnv = process.env.EXPO_PUBLIC_APP_ENV || 'development';

/** Timeout padrão das requisições HTTP, em milissegundos. */
export const requestTimeoutMs = Number(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS || 10000);

export const isProduction = appEnv === 'production';
