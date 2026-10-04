import { useMemo, useRef, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { MenuView, type MenuAction, type MenuComponentRef } from '@expo/ui/community/menu';

import { IconButton } from './icon-button';

export type MenuItem = {
  /** Identificador estável: volta em `onPressAction.nativeEvent.event`. */
  id: string;
  label: string;
  onSelect: () => void;
  /** Destaca a ação em vermelho, para o que não pode ser desfeito. */
  destructive?: boolean;
};

type MenuProps = {
  /**
   * Rótulo lido por leitores de tela. O botão de três pontinhos não tem texto
   * visível, então este é o único nome que a ação tem.
   */
  accessibilityLabel: string;
  items: MenuItem[];
  /** Substitui o botão de três pontinhos padrão. */
  trigger?: ReactNode;
  testID?: string;
};

/**
 * Menu dropdown ancorado num botão de três pontinhos.
 *
 * O menu é o `MenuView` do `@expo/ui`: SwiftUI `Menu` no iOS e `DropdownMenu` do
 * Material 3 no Android, ou seja, o mesmo menu que o sistema desenha para
 * qualquer outro app. Escrever o painel em JavaScript custaria um `Modal`, medir
 * a âncora e ainda ficaria com cara de app web.
 *
 * Os itens são declarados como dados (`items`) e não como filhos, porque o menu é
 * nativo: ele recebe uma lista de ações e devolve o `id` da que foi escolhida.
 *
 * O `onPress` do botão de três pontinhos só existe no Android, e é ele — não o
 * `Pressable` que o `MenuView` coloca em volta do trigger — que abre o menu lá.
 * No Android o `MenuView` é um `DropdownMenu` do Material 3 controlado por JS: o
 * único caminho para `expanded = true` é o `onPress` do wrapper. Como o
 * `IconButton` é um `Pressable` e todo `Pressable` responde ao toque primeiro
 * (o `Pressability` devolve `true` no `onStartShouldSetResponder` mesmo sem
 * handler algum), ele tomava o responder do wrapper e o toque morria ali. Com o
 * `onPress` aqui, quem responde é o botão, e `show()` é a API pública do
 * `MenuView` para abrir o menu programaticamente.
 *
 * No iOS o botão é um `Menu` nativo do SwiftUI, que abre no toque por conta
 * própria e ignora o responder do JS, então o menu já funciona sem handler. E
 * `show()` é no-op lá — com um `console.warn` em desenvolvimento —, daí o
 * `Platform.OS` em vez de chamar `show()` nas duas plataformas.
 *
 * **A ação do menu espera um frame para navegar.** O `onPressAction` chega com o
 * menu nativo ainda se fechando, e quase toda ação nossa muda de tela. No iOS o
 * menu é um `UIHostingController` do SwiftUI: navegar no mesmo tick desmonta o
 * controller de onde ele vai se apresentar, e o iOS avisa no console que isso pode
 * dar inset de safe area errado — e que vira exceção em uma versão futura. Um
 * `requestAnimationFrame` deixa o menu terminar de sair antes de a tela mudar, e no
 * Android não muda nada, porque o `DropdownMenu` do Material já fechou quando a
 * ação chega.
 *
 * **O array de ações é memoizado pelo conteúdo, não pela identidade.** As telas
 * montam `items` dentro do render, então um array novo a cada render fazia o menu
 * nativo tentar se atualizar sem necessidade — e é esse `updateVisibleMenu` sem
 * menu visível que o iOS reclama. Só o que o nativo lê entra na chave; o
 * `onSelect` continua sendo procurado no `items` do render atual, que é sempre o
 * callback novo.
 */
export function Menu({ accessibilityLabel, items, trigger, testID }: MenuProps) {
  const menuRef = useRef<MenuComponentRef>(null);

  const actionsSignature = JSON.stringify(
    items.map(({ id, label, destructive }) => ({ id, label, destructive })),
  );

  const actions = useMemo<MenuAction[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.label,
        attributes: item.destructive ? { destructive: true } : undefined,
      })),
    // A dependência é a chave de conteúdo: `items` muda de identidade a cada
    // render das telas, e o que o nativo lê são só `id`, `label` e `destructive`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actionsSignature],
  );

  const handleSelect = (event: { nativeEvent: { event: string } }) => {
    const selected = items.find((item) => item.id === event.nativeEvent.event);

    if (!selected) return;

    requestAnimationFrame(() => selected.onSelect());
  };

  return (
    <MenuView ref={menuRef} actions={actions} onPressAction={handleSelect} testID={testID}>
      {trigger ?? (
        <IconButton
          icon="dots-vertical"
          accessibilityLabel={accessibilityLabel}
          onPress={Platform.OS === 'android' ? () => menuRef.current?.show() : undefined}
        />
      )}
    </MenuView>
  );
}
