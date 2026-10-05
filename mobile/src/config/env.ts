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

/**
 * Origem dos dados: `api` (padrão) usa a REST do backend; `memory` mantém o
 * protótipo em memória para desenvolver a interface com a API desligada.
 */
export const dataSource = process.env.EXPO_PUBLIC_DATA_SOURCE || 'api';

export const useInMemoryData = dataSource === 'memory';

/**
 * Modo de autenticação: `dev` aceita qualquer par e-mail/senha válido, para
 * facilitar o desenvolvimento enquanto o backend não tem endpoint de login;
 * qualquer outro valor exige autenticação real.
 */
export const authMode = process.env.EXPO_PUBLIC_AUTH_MODE || 'dev';

export const isDevAuth = authMode === 'dev';

/**
 * Chave da API do Google Maps SDK for Android, ou string vazia.
 *
 * Ela entra no `.env` em vez de ficar só no `app.json` porque o mesmo valor
 * serve a dois lugares: o `app.config.ts` injeta no plugin do `prebuild` para o
 * `AndroidManifest.xml` receber o `com.google.android.geo.API_KEY`, e o
 * `EventMap` precisa saber se ela existe para não montar um `MapView` que mata o
 * processo no Android.
 *
 * Não é segredo: a chave acaba dentro do APK, no manifesto, e o Google restringe
 * o uso por pacote Android e assinatura em vez de por sigilo. `PLACEHOLDER` é o
 * valor enquanto o Google Cloud não emite uma chave de verdade — o mesmo
 * literal do `app.config.ts`, que por isso nunca a injeta no manifesto.
 */
export const googleMapsAndroidApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY || '';

/** `true` só quando existe chave de verdade: nem vazia nem o placeholder. */
export const hasGoogleMapsAndroidKey =
  googleMapsAndroidApiKey !== '' && googleMapsAndroidApiKey !== 'PLACEHOLDER';
