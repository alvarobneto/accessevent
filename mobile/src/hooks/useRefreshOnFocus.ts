import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Recarrega os dados quando a tela volta a ficar em foco.
 *
 * É o que mantém a tela coerente depois de uma escrita feita em outra tela: o app
 * navega de volta com `router.back()`, `router.dismissTo` ou `router.replace`, a
 * tela não é remontada e, sem isto, continuaria mostrando o snapshot da
 * montagem. Vale para as listas (um evento criado ou apagado em outro lugar) e
 * para as telas de detalhes (o editor de evento ou de título é alcançado a partir
 * delas).
 *
 * O primeiro foco é ignorado de propósito — ele é o carregamento inicial, que o
 * `useAsyncData` já faz. O recarregamento de foco é silencioso e não acende o
 * indicador de pull-to-refresh. O callback fica numa ref para que a identidade
 * do efeito não dependa de como a tela montou o `refresh`.
 */
export function useRefreshOnFocus(refresh: (showIndicator: boolean) => void): void {
  const isFirstFocus = useRef(true);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  });

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }

      refreshRef.current(false);
    }, []),
  );
}
