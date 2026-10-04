import { useState } from 'react';
import { View } from 'react-native';

import { Section } from '@/components/section';
import { Alert, Dialog, Icon, IconButton, ListRow, Text } from '@/components/ui';
import { repository } from '@/data';
import type { Path } from '@/data/types';
import { colors } from '@/theme/tokens';
import { toErrorMessage } from '@/utils/errors';
import { formatDateTime, formatDistance } from '@/utils/format';

type PathListProps = {
  paths: readonly Path[];
  /** Recarrega a lista depois de apagar; quem chamou é que sabe como. */
  onChanged: () => void;
};

/**
 * Caminhos registrados na navegação.
 *
 * Cada linha é um `Path` gravado (PRD §23): a distância estimada, quantos pontos
 * entraram no trajeto e quando a caminhada aconteceu. O caminho não tem nome
 * ainda — nomear e editar é da Sprint 6 — então o que identifica a linha é o que
 * a pessoa reconhece: onde andou, quanto deu e quando.
 *
 * O botão de apagar fica na linha, e não no menu do cabeçalho, pelo mesmo motivo
 * do `DeleteAction`: apagar não se desfaz. A confirmação é o diálogo, que repete a
 * distância e a data para ninguém apagar o trajeto errado. Editar o caminho —
 * selecionar, mover pontos, apagar — é da Sprint 6, e é ela que vai dar o nome.
 */
export function PathList({ paths, onChanged }: PathListProps) {
  return (
    <Section
      title="Caminhos registrados"
      description="Os trajetos que você percorreu, desenhados no mapa acima."
    >
      <View className="gap-3">
        {paths.map((path) => (
          <PathRow key={path.id} path={path} onChanged={onChanged} />
        ))}
      </View>
    </Section>
  );
}

type PathRowProps = {
  path: Path;
  onChanged: () => void;
};

function PathRow({ path, onChanged }: PathRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distance = formatDistance(path.distance);
  const recordedAt = formatDateTime(path.createdAt);
  const pointLabel = path.geometry.length === 1 ? 'ponto' : 'pontos';

  const closeDialog = () => {
    // Enquanto o pedido está em voo o diálogo não fecha: sumir no meio da operação
    // deixaria a pessoa sem saber se o caminho foi apagado.
    if (isDeleting) return;
    setIsOpen(false);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await repository.deletePath(path.id);
      setIsOpen(false);
      setIsDeleting(false);
      onChanged();
    } catch (cause) {
      setError(toErrorMessage(cause, 'Não foi possível apagar o caminho.'));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ListRow
        title={`Caminho de ${distance}`}
        description={`${path.geometry.length} ${pointLabel} no trajeto`}
        meta={`Gravado em ${recordedAt}`}
        icon={<Icon name="vector-polyline" size={20} color={colors.gray500} />}
        trailing={
          <IconButton
            icon="trash-can-outline"
            accessibilityLabel={`Apagar caminho de ${distance}`}
            onPress={() => {
              setError(null);
              setIsOpen(true);
            }}
            disabled={isDeleting}
          />
        }
      />

      <Dialog
        open={isOpen}
        onClose={closeDialog}
        icon="alert-outline"
        destructive
        title="Apagar caminho?"
        description={`Caminho de ${distance}, gravado em ${recordedAt}. Esta ação não pode ser desfeita.`}
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

/** Caminho sem nome e sem linha: o texto que explica o que fazer em vez de sumir. */
export function NoPathsHint() {
  return (
    <Section title="Caminhos registrados">
      <Text variant="caption">
        Nenhum caminho ainda. Grave um com o botão acima: o trajeto aparece desenhado no mapa.
      </Text>
    </Section>
  );
}
