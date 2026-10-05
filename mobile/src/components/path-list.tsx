import { useState } from 'react';
import { View } from 'react-native';

import { Section } from '@/components/section';
import { Alert, Dialog, Icon, IconButton, ListRow, Text } from '@/components/ui';
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
 * **A linha abre o editor do caminho, e o botão de apagar é ação à parte.** É a
 * exceção ao combinado de "item de lista abre, menu edita", e ela é deliberada: o
 * hub já é a tela do desenho, e o mapa é a informação que decide qual caminho se
 * quer mexer. Editar pelo menu do cabeçalho obrigaria a abrir o caminho errado
 * primeiro — o menu é do mapa, não da linha — e quem chega da gravação precisa
 * renomear o trajeto que acabou de desenhar sem passar por outra lista.
 *
 * O botão de apagar fica na linha, e não no menu do cabeçalho, pelo mesmo motivo
 * do `DeleteAction`: apagar não se desfaz. A confirmação é o diálogo, que repete o
 * nome e a data para ninguém apagar o trajeto errado. Ele é `trailingAction` e não
 * `trailing` porque um botão dentro da área tocável da linha desaparece para o
 * leitor de tela — ver `ListRow`.
 */
export function PathList({ paths, onOpen, onChanged }: PathListProps) {
  return (
    <Section title="Caminhos registrados" description="Toque em um caminho para renomeá-lo.">
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
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = pathLabels(path);
  const recordedAt = formatDateTime(path.createdAt);

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
        title={labels.title}
        description={labels.description}
        meta={`Gravado em ${recordedAt}`}
        icon={<Icon name="vector-polyline" size={20} color={colors.gray500} />}
        onPress={onOpen}
        accessibilityLabel={`Editar o caminho ${labels.title}, gravado em ${recordedAt}`}
        trailingAction={
          <IconButton
            icon="trash-can-outline"
            accessibilityLabel={`Apagar o caminho ${labels.title}`}
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
        description={`${labels.title}, gravado em ${recordedAt}. Esta ação não pode ser desfeita.`}
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
