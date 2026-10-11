import { useState } from 'react';
import { View } from 'react-native';

import { Section } from '@/components/section';
import { Alert, Dialog, Icon, IconButton, ListRow, Text } from '@/components/ui';
import { repository } from '@/data';
import type { PointOfInterest } from '@/data/types';
import { colors } from '@/theme/tokens';
import { toErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';

type PoiListProps = {
  pois: readonly PointOfInterest[];
  /** Abre o editor do ponto. */
  onOpen: (poiId: string) => void;
  /** Recarrega a lista depois de apagar; quem chamou é que sabe como. */
  onChanged: () => void;
};

/**
 * Pontos de interesse registrados na navegação.
 *
 * **A linha abre o editor do ponto, e o botão de apagar é ação à parte**, pela
 * mesma razão do `PathList`: o hub é a tela do desenho e o mapa é a informação que
 * decide qual ponto se quer mexer. Editar pelo menu do cabeçalho do mapa obrigaria
 * a abrir o ponto errado primeiro.
 *
 * O botão é `trailingAction` e não `trailing` porque `trailing` fica dentro da área
 * tocável da linha, e um botão dentro do botão da linha desaparece para o leitor de
 * tela — ver `ListRow`.
 */
export function PoiList({ pois, onOpen, onChanged }: PoiListProps) {
  return (
    <Section
      title="Pontos de interesse"
      description="Toque em um ponto para renomear, mover ou apagar."
    >
      <View className="gap-3">
        {pois.map((poi) => (
          <PoiRow key={poi.id} poi={poi} onOpen={() => onOpen(poi.id)} onChanged={onChanged} />
        ))}
      </View>
    </Section>
  );
}

/** Caminho sem ponto e sem linha: o texto que explica o que fazer em vez de sumir. */
export function NoPoisHint() {
  return (
    <Section title="Pontos de interesse">
      <Text variant="caption">
        Nenhum ponto ainda. Use “Editar a navegação” para adicionar entrada, banheiro, elevador e o
        resto que o participante procura.
      </Text>
    </Section>
  );
}

type PoiRowProps = {
  poi: PointOfInterest;
  onOpen: () => void;
  onChanged: () => void;
};

function PoiRow({ poi, onOpen, onChanged }: PoiRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = () => {
    setError(null);
    setIsOpen(true);
  };

  // Enquanto o pedido está em voo o diálogo não fecha: sumir no meio da operação
  // deixaria a pessoa sem saber se o ponto foi apagado.
  const closeDialog = () => {
    if (isDeleting) return;
    setIsOpen(false);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await repository.deletePoi(poi.id);
      setIsOpen(false);
      setIsDeleting(false);
      onChanged();
    } catch (cause) {
      setError(toErrorMessage(cause, 'Não foi possível apagar o ponto.'));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ListRow
        title={`${poi.name} • ${poi.type}`}
        description={poi.description ?? undefined}
        meta={`Criado em ${formatDateTime(poi.createdAt)}`}
        icon={<Icon name="map-marker-outline" size={20} color={colors.gray500} />}
        onPress={onOpen}
        accessibilityLabel={`Editar o ponto de interesse ${poi.name}, do tipo ${poi.type}`}
        trailingAction={
          <IconButton
            icon="trash-can-outline"
            accessibilityLabel={`Apagar o ponto de interesse ${poi.name}`}
            onPress={openDialog}
            disabled={isDeleting}
          />
        }
      />
      <Dialog
        open={isOpen}
        onClose={closeDialog}
        icon="alert-outline"
        destructive
        title="Apagar ponto de interesse?"
        description={`${poi.name} (${poi.type}). Esta ação não pode ser desfeita.`}
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        confirmLoading={isDeleting}
        onConfirm={() => void confirmDelete()}
      >
        {error ? <Alert tone="error" title="Não foi possível apagar" description={error} /> : null}
      </Dialog>
    </>
  );
}
