import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Section } from '@/components/section';
import { Alert, Dialog, Icon, Input, Menu, Text } from '@/components/ui';
import { repository } from '@/data';
import type { Path } from '@/data/types';
import { colors } from '@/theme/tokens';
import { toErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';
import { pathLabels } from '@/utils/pathLabel';

type PathListProps = {
  paths: readonly Path[];
  /** Abre o editor de um caminho. */
  onOpen: (pathId: string) => void;
  /** Recarrega a lista depois de apagar; quem chamou é que sabe como. */
  onChanged: () => void;
};

/**
 * Caminhos registrados na navegação.
 *
 * Cada linha é um `Path` gravado (PRD §23): o nome que o organizador deu, a
 * distância estimada, quantos pontos entraram no trajeto e quando a caminhada
 * aconteceu. Caminho sem nome se anuncia pela distância, que é o que a pessoa
 * reconhece — ver `pathLabels`.
 *
 * A linha abre o editor do trajeto; o menu do próprio card permite renomear ou
 * apagar sem sair do mapa. A ação irreversível sempre pede confirmação.
 */
export function PathList({ paths, onOpen, onChanged }: PathListProps) {
  return (
    <Section
      title="Caminhos registrados"
      description="Toque em um caminho para editar o trajeto ou abra o menu para renomear e apagar."
    >
      <View className="gap-3">
        {paths.map((path) => (
          <PathRow key={path.id} path={path} onOpen={() => onOpen(path.id)} onChanged={onChanged} />
        ))}
      </View>
    </Section>
  );
}

type PathRowProps = {
  path: Path;
  onOpen: () => void;
  onChanged: () => void;
};

function PathRow({ path, onOpen, onChanged }: PathRowProps) {
  const [dialog, setDialog] = useState<'delete' | 'rename' | null>(null);
  const [pendingAction, setPendingAction] = useState<'delete' | 'rename' | null>(null);
  const [name, setName] = useState(path.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const labels = pathLabels(path);
  const recordedAt = formatDateTime(path.createdAt);

  const closeDialog = () => {
    // Enquanto o pedido está em voo o diálogo não fecha: sumir no meio da operação
    // deixaria a pessoa sem saber se a alteração foi salva.
    if (pendingAction) return;
    setDialog(null);
  };

  const confirmDelete = async () => {
    setPendingAction('delete');
    setError(null);

    try {
      await repository.deletePath(path.id);
      setDialog(null);
      setPendingAction(null);
      onChanged();
    } catch (cause) {
      setError(toErrorMessage(cause, 'Não foi possível apagar o caminho.'));
      setPendingAction(null);
    }
  };

  const confirmRename = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setValidationError('Informe um nome para o caminho.');
      return;
    }

    setPendingAction('rename');
    setError(null);
    setValidationError(null);

    try {
      await repository.updatePath(path.id, { name: trimmedName });
      setDialog(null);
      setPendingAction(null);
      onChanged();
    } catch (cause) {
      setError(toErrorMessage(cause, 'Não foi possível renomear o caminho.'));
      setPendingAction(null);
    }
  };

  const openDeleteDialog = () => {
    setError(null);
    setDialog('delete');
  };

  const openRenameDialog = () => {
    setName(path.name ?? '');
    setError(null);
    setValidationError(null);
    setDialog('rename');
  };

  return (
    <>
      <View className="flex-row items-center gap-2 rounded-lg border border-border bg-background p-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar o caminho ${labels.title}, gravado em ${recordedAt}`}
          onPress={onOpen}
          className="flex-1 flex-row items-center gap-3 rounded-lg p-2 active:opacity-70"
        >
          <Icon name="vector-polyline" size={20} color={colors.gray500} />
          <View className="flex-1 gap-1">
            <Text variant="subheading" numberOfLines={2}>
              {labels.title}
            </Text>
            <Text variant="caption" numberOfLines={2}>
              {labels.description}
            </Text>
            <Text variant="caption">Gravado em {recordedAt}</Text>
          </View>
        </Pressable>

        <Menu
          accessibilityLabel={`Ações do caminho ${labels.title}`}
          items={[
            { id: 'rename', label: 'Renomear', onSelect: openRenameDialog },
            { id: 'delete', label: 'Apagar', onSelect: openDeleteDialog, destructive: true },
          ]}
        />
      </View>

      <Dialog
        open={dialog === 'delete'}
        onClose={closeDialog}
        icon="alert-outline"
        destructive
        title="Apagar caminho?"
        description={`${labels.title}, gravado em ${recordedAt}. Esta ação não pode ser desfeita.`}
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        confirmLoading={pendingAction === 'delete'}
        onConfirm={() => void confirmDelete()}
      >
        {error ? <Alert tone="error" title="Não foi possível apagar" description={error} /> : null}
      </Dialog>

      <Dialog
        open={dialog === 'rename'}
        onClose={closeDialog}
        icon="edit-outline"
        title="Renomear caminho"
        description="Escolha como este caminho deve aparecer na lista e no mapa."
        confirmLabel="Salvar nome"
        cancelLabel="Cancelar"
        confirmLoading={pendingAction === 'rename'}
        onConfirm={() => void confirmRename()}
      >
        <Input
          label="Nome do caminho"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setValidationError(null);
            setError(null);
          }}
          placeholder="Ex.: Entrada até o auditório"
          autoCapitalize="sentences"
          maxLength={120}
          errorText={validationError ?? undefined}
          testID={`rename-path-${path.id}`}
        />
        {error ? <Alert tone="error" title="Não foi possível renomear" description={error} /> : null}
      </Dialog>
    </>
  );
}

/** Caminho sem nome e sem linha: o texto que explica o que fazer em vez de sumir. */
export function NoPathsHint() {
  return (
    <Section title="Caminhos registrados">
      <Text variant="caption">
        Nenhum caminho ainda. Use “Editar a navegação” para gravar um trajeto: ele aparece desenhado
        no mapa.
      </Text>
    </Section>
  );
}
