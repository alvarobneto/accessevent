import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Recarrega os dados quando a tela volta a ficar em foco.
 *
 * É o que mantém "Gerenciar evento" coerente depois de uma edição: o app navega
 * de volta com `router.back()`, a tela não é remontada e, sem isto, continuaria
 * mostrando o evento antigo.
 *
 * O primeiro foco é ignorado de propósito — ele é o carregamento inicial, que o
 * `useAsyncData` já faz. O callback fica numa ref para que a identidade do
 * efeito não dependa de como a tela montou o `refresh`.
 */
export function useRefreshOnFocus(refresh: () => void): void {
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

      refreshRef.current();
    }, []),
  );
}
