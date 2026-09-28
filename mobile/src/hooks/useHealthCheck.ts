import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/services/apiClient';
import { healthService, type HealthStatus } from '@/services/healthService';

export type HealthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: HealthStatus }
  | { status: 'degraded'; data: HealthStatus }
  | { status: 'error'; message: string };

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Erro inesperado ao consultar o servidor.';
}

/**
 * O `/health` responde 503 com o payload completo quando o PostgreSQL está fora
 * do ar. Nesse caso o corpo ainda é útil, então ele é aproveitado em vez de
 * virar uma mensagem genérica.
 */
function toDegraded(error: unknown): HealthStatus | null {
  if (!(error instanceof ApiError) || !error.body || typeof error.body !== 'object') {
    return null;
  }
  const body = error.body as Partial<HealthStatus>;
  return typeof body.status === 'string' && 'database' in body ? (body as HealthStatus) : null;
}

export function useHealthCheck() {
  const [state, setState] = useState<HealthState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    const load = async () => {
      try {
        setState({ status: 'success', data: await healthService.check(controller.signal) });
      } catch (error) {
        if (controller.signal.aborted) return;
        const degraded = toDegraded(error);
        setState(
          degraded
            ? { status: 'degraded', data: degraded }
            : { status: 'error', message: toErrorMessage(error) },
        );
      }
    };

    void load();

    return () => controller.abort();
  }, []);

  /** Consulta manual, disparada pelo botão "Verificar novamente". */
  const check = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState({ status: 'loading' });

    try {
      setState({ status: 'success', data: await healthService.check(controller.signal) });
    } catch (error) {
      if (controller.signal.aborted) return;
      const degraded = toDegraded(error);
      setState(
        degraded
          ? { status: 'degraded', data: degraded }
          : { status: 'error', message: toErrorMessage(error) },
      );
    }
  }, []);

  return { state, check };
}
