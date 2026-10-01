import { useCallback, useEffect, useRef, useState } from 'react';

import { isAbortError, toErrorMessage } from '@/utils/errors';

export type AsyncDataState<T> =
  { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; message: string };

export type AsyncDataLoader<T> = (signal: AbortSignal) => Promise<T>;

const ERROR_FALLBACK = 'Não foi possível carregar os dados. Tente novamente.';

type Result<T> = {
  key: string | undefined;
  attempt: number;
  state: AsyncDataState<T>;
};

/**
 * Carrega dados de forma assíncrona e expõe os três estados que toda tela do
 * app precisa tratar: carregando, erro (com "tentar novamente") e sucesso.
 *
 * O resultado é guardado junto com a chave e a tentativa que o produziram, então o
 * estado exibido é sempre derivado: se a chave mudar (por exemplo, ao trocar de
 * evento na rota) ou se o usuário pedir uma nova tentativa, o app volta para
 * "carregando" sem precisar sincronizar estado dentro do efeito.
 *
 * O `loader` fica numa ref para poder ser uma função inline sem reprocessar o
 * efeito a cada render.
 */
export function useAsyncData<T>(loader: AsyncDataLoader<T>, key?: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T>>({
    key,
    attempt: 0,
    state: { status: 'loading' },
  });

  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    const controller = new AbortController();

    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setResult({ key, attempt, state: { status: 'success', data } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setResult({
          key,
          attempt,
          state: { status: 'error', message: toErrorMessage(error, ERROR_FALLBACK) },
        });
      });

    return () => controller.abort();
  }, [key, attempt]);

  const state: AsyncDataState<T> =
    result.key === key && result.attempt === attempt ? result.state : { status: 'loading' };

  /** Nova tentativa manual, disparada pelo botão "Tentar novamente". */
  const reload = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { state, reload };
}
