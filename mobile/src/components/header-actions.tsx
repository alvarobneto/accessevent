import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { IconButton } from '@/components/ui';

/**
 * Ações dos cabeçalhos das seções de organizador e usuário.
 *
 * - À esquerda, voltar para a tela anterior.
 * - À direita, trocar de modo e voltar para a tela inicial de escolha.
 *
 * A troca de modo vive no cabeçalho (e não como um card no fim da lista) para
 * não repetir o mesmo caminho em todas as telas.
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
 * Botão que leva de volta para a tela de escolha de modo.
 *
 * `dismissTo('/')` funciona das duas formas: dentro de uma tela aninhada ele
 * sobe até a tela inicial e descarta o histórico da seção; na raiz das seções
 * (onde `/` não está na pilha) ele substitui a seção inteira pela tela inicial.
 */
export function HeaderModeButton() {
  return (
    <IconButton
      icon="account-switch-outline"
      accessibilityLabel="Trocar de modo"
      onPress={() => router.dismissTo('/')}
      testID="header-switch-mode"
    />
  );
}

/**
 * Lado direito do cabeçalho: as ações da tela, quando existirem, e a troca de
 * modo.
 *
 * `Stack.Screen` sobrescreve `headerRight` inteiro, então uma tela que precise do
 * próprio menu precisa montar este componente em vez de repetir o botão de modo.
 * `children` fica à esquerda para manter a hierarquia do iOS: a ação da tela
 * primeiro, a troca de modo por último.
 */
export function HeaderActions({ children }: { children?: ReactNode }) {
  return (
    <View className="flex-row items-center">
      {children}
      <HeaderModeButton />
    </View>
  );
}
