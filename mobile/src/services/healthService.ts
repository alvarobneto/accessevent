import { api } from '@/services/apiClient';

/** Resposta do endpoint `GET /health` do backend. */
export type HealthStatus = {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  environment: string;
  database: {
    status: 'up' | 'down';
    latencyMs: number | null;
  };
  timestamp: string;
};

export const healthService = {
  check: (signal?: AbortSignal) => api.get<HealthStatus>('/health', { signal }),
};
