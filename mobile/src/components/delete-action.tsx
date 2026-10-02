import { useState } from 'react';
import { View } from 'react-native';

import { Section } from '@/components/section';
import { Alert, Button, Dialog, Icon, Text } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { toErrorMessage } from '@/utils/errors';

type DeleteActionProps = {
  /** O que está sendo apagado, com artigo: "o evento", "a navegação". */
  subject: string;
  /** Nome do registro, para a pessoa conferir o que está apagando. */
  name: string;
  /** O que vai junto no banco; omitido quando nada além do registro some. */
  consequence?: string;
  confirmLoadingLabel: string;
  errorFallback: string;
  onDelete: () => Promise<void>;
  /** Chamado depois do sucesso; normalmente `router.dismissTo(...)`. */
  onDeleted: () => void;
  testID?: string;
};

/**
 * Ação destrutiva de uma tela de detalhes, com confirmação antes de apagar.
 *
 * Fica no corpo da tela e não no menu de três pontinhos de propósito: apagar é
 * irreversível, e um item de menu fica a um toque de distância do resto das ações
 * do dia a dia. A confirmação é o que segura o engano, então o diálogo sempre
 * pergunta de novo e mostra o nome do registro — quem chega à tela dos detalhes
 * pelo link errado não pode acabar apagando a coisa certa.
 *
 * O apagado vai no repositório, nunca na tela: se a API falhar, o registro
 * continua lá e a pessoa lê o motivo no diálogo em vez de perder a tela.
 */
export function DeleteAction({
  subject,
  name,
  consequence,
  confirmLoadingLabel,
  errorFallback,
  onDelete,
  onDeleted,
  testID,
}: DeleteActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = () => {
    setError(null);
    setIsOpen(true);
  };

  // Enquanto o pedido está em voo o diálogo não fecha: sumir no meio da operação
  // deixaria a pessoa sem saber se o registro foi apagado.
  const closeDialog = () => {
    if (isDeleting) return;
    setIsOpen(false);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await onDelete();
      setIsOpen(false);
      setIsDeleting(false);
      onDeleted();
    } catch (cause) {
      setError(toErrorMessage(cause, errorFallback));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Section title="Apagar">
        <View className="gap-3">
          <Button
            label={`Apagar ${subject}`}
            variant="danger"
            fullWidth
            iconStart={<Icon name="trash-can-outline" size={20} color={colors.background} />}
            onPress={openDialog}
            testID={testID ?? 'delete-action'}
          />

          <Text variant="caption">
            {consequence
              ? `${consequence} A ação não pode ser desfeita.`
              : 'A ação não pode ser desfeita.'}
          </Text>
        </View>
      </Section>

      <Dialog
        open={isOpen}
        onClose={closeDialog}
        icon="alert-outline"
        destructive
        title={`Apagar ${subject}?`}
        description={`${name}. ${consequence ? `${consequence} ` : ''}Esta ação não pode ser desfeita.`}
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
