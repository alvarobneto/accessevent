import { router } from 'expo-router';

import { HeaderActions } from '@/components/header-actions';
import type { MenuMode } from '@/components/event-menu';
import { Menu } from '@/components/ui';

/**
 * Menu de três pontinhos da navegação. No organizador e no participante tem
 * "Ver detalhes" — pelo mesmo motivo do `EventMenu`: quem consulta não edita.
 *
 * "Editar navegação" saiu daqui quando o hub ganhou o botão do mesmo nome: o
 * menu ficaria a um passo de uma tela (a de detalhes) que não tem mais o item,
 * e ação do dia a dia não é trabalho de menu.
 *
 * `eventId` só é usado no modo organizador, em que a tela de detalhes é
 * aninhada no evento (`/organizer/event/[eventId]/map/[mapId]/details`). No modo
 * participante ela é irmã da tela do mapa, que não conhece o evento.
 */
export function NavigationMenu({
  eventId,
  mapId,
  mapName,
  mode = 'organizer',
  showDetails = true,
}: {
  eventId?: string;
  mapId: string;
  mapName?: string;
  mode?: MenuMode;
  showDetails?: boolean;
}) {
  const label = mapName ? `Opções da navegação ${mapName}` : 'Opções da navegação';

  // No organizador o item só existe com `eventId`: sem ele o caminho aninhado não
  // se monta. No participante não é preciso, porque a tela é `/user/map/[mapId]`.
  const hasDetails = showDetails && (mode === 'user' || Boolean(eventId));

  const items = [
    // O caminho fica dentro do `push` de propósito: o `Href` do Expo Router só
    // aceita template com prefixo literal, então extraí-lo para uma variável o
    // transformaria em `string` e o typecheck recusaria.
    ...(hasDetails
      ? [
          {
            id: 'details',
            label: 'Ver detalhes',
            onSelect: () =>
              router.push(
                mode === 'organizer'
                  ? `/organizer/event/${eventId}/map/${mapId}/details`
                  : `/user/map/${mapId}/details`,
              ),
          },
        ]
      : []),
  ];

  return (
    <HeaderActions>
      <Menu accessibilityLabel={label} items={items} testID="navigation-menu" />
    </HeaderActions>
  );
}
