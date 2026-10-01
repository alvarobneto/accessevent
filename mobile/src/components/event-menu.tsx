import { router } from 'expo-router';

import { HeaderActions } from '@/components/header-actions';
import { Menu } from '@/components/ui';

/**
 * Modo de uso da seção. As rotas de detalhes diferem entre organizador e
 * participante, e só o organizador edita.
 */
export type MenuMode = 'organizer' | 'user';

/**
 * Menu de três pontinhos do evento: as ações que não cabem num card no topo da
 * tela. Todas as telas do evento usam o mesmo menu, então a lista mora aqui.
 *
 * Ver os dados e editar os dados são ações diferentes e ficam separadas na
 * interface; abrir a tela do evento pelo item da lista continua sendo o caminho
 * para o dia a dia, e o menu é para quem chegou até lá e quer outra coisa.
 *
 * `showDetails` é `false` na própria tela de detalhes: oferecer "Ver detalhes"
 * de dentro dela empilharia uma segunda cópia da mesma tela na pilha.
 */
export function EventMenu({
  eventId,
  eventName,
  mode = 'organizer',
  showDetails = true,
}: {
  eventId: string;
  eventName?: string;
  mode?: MenuMode;
  showDetails?: boolean;
}) {
  const label = eventName ? `Opções do evento ${eventName}` : 'Opções do evento';

  const items = [
    // O caminho fica dentro do `push` de propósito: o `Href` do Expo Router só
    // aceita template com prefixo literal, então extraí-lo para uma variável o
    // transformaria em `string` e o typecheck recusaria.
    ...(showDetails
      ? [
          {
            id: 'details',
            label: 'Ver detalhes',
            onSelect: () =>
              router.push(
                mode === 'organizer'
                  ? `/organizer/event/${eventId}/details`
                  : `/user/event/${eventId}/details`,
              ),
          },
        ]
      : []),
    // O participante só consulta: o item de edição não existe para ele.
    ...(mode === 'organizer'
      ? [
          {
            id: 'edit',
            label: 'Editar evento',
            onSelect: () => router.push(`/organizer/event/${eventId}/edit`),
          },
        ]
      : []),
  ];

  return (
    <HeaderActions>
      <Menu accessibilityLabel={label} items={items} testID="event-menu" />
    </HeaderActions>
  );
}
