import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { IconButton } from '@/components/ui';

/**
 * Ações dos cabeçalhos das seções de organizador e usuário.
 *
 * - À esquerda, voltar para a tela anterior.
 * - À direita, ações da tela (menus contextuais).
 */

/** Botão de voltar: some quando não há tela anterior na pilha. */
export function HeaderBackButton({ canGoBack }: { canGoBack?: boolean }) {
  if (!canGoBack) {
    return null;
  }

  return (
    <IconButton
      icon="arrow-left"
      accessibilityLabel="Voltar"
      onPress={() => router.back()}
      testID="header-back"
    />
  );
}

/**
 * Lado direito do cabeçalho: as ações contextuais da tela, quando existirem.
 */
export function HeaderActions({ children }: { children?: ReactNode }) {
  if (!children) {
    return null;
  }

  return <View className="flex-row items-center">{children}</View>;
}
