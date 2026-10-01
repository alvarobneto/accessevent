import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Alert, Button, Spinner, Text } from '@/components/ui';
import type { AsyncDataState } from '@/hooks/useAsyncData';

type AsyncContentProps<T> = {
  state: AsyncDataState<T>;
  onRetry: () => void;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  loadingLabel?: string;
};

/**
 * Trata os três estados de qualquer carregamento: carregando, erro com
 * "tentar novamente" e sucesso. Evita que cada tela reimplemente isso.
 */
export function AsyncContent<T>({
  state,
  onRetry,
  children,
  isEmpty,
  empty,
  loadingLabel = 'Carregando…',
}: AsyncContentProps<T>) {
  if (state.status === 'loading') {
    return (
      <View accessibilityRole="progressbar" className="items-center gap-3 py-12">
        <Spinner />
        <Text variant="caption">{loadingLabel}</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <Alert
        tone="error"
        title="Não foi possível carregar"
        description={state.message}
        action={<Button label="Tentar de novo" size="sm" variant="outline" onPress={onRetry} />}
      />
    );
  }

  if (isEmpty?.(state.data)) {
    return <>{empty}</>;
  }

  return <>{children(state.data)}</>;
}
