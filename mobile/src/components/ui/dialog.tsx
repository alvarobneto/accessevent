import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  icon?: IconName;
  title: string;
  description?: string;
  /** Conteúdo opcional entre a descrição e as ações. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  destructive?: boolean;
};

/**
 * Diálogo modal: fundo escurecido, cartão centralizado e foco na decisão.
 * Usado para confirmar ações e trocar o modo de uso.
 */
export function Dialog({
  open,
  onClose,
  icon = 'help-circle-outline',
  title,
  description,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  confirmLoading = false,
  destructive = false,
}: DialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Fechar"
        accessibilityRole="button"
        onPress={onClose}
        className="flex-1 items-center justify-center bg-gray-900/40 px-6 py-10"
      >
        <Pressable
          accessibilityViewIsModal
          accessibilityRole="alert"
          onPress={(event) => event.stopPropagation()}
          className="w-full max-w-md gap-4 rounded-xl border border-border bg-background p-6 shadow-md"
        >
          <View className="flex-row items-start gap-3">
            <View className="size-12 items-center justify-center rounded-md bg-primary-50">
              <Icon name={icon} size={24} color={destructive ? colors.error : colors.primary} />
            </View>
            <View className="flex-1 gap-1">
              <Text variant="heading">{title}</Text>
              {description ? <Text variant="caption">{description}</Text> : null}
            </View>
          </View>

          {children}

          <View className="mt-1 flex-row gap-3">
            <Button label={cancelLabel} variant="outline" className="flex-1" onPress={onClose} />
            {onConfirm ? (
              <Button
                label={confirmLabel}
                variant={destructive ? 'danger' : 'solid'}
                className="flex-1"
                loading={confirmLoading}
                onPress={onConfirm}
              />
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
