import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { tv } from '../../lib/tv';

import { Text } from './text';

type ListRowProps = {
  title: string;
  description?: string;
  /** Linha secundária, como data ou contagem. */
  meta?: string;
  icon?: ReactNode;
  /** Conteúdo decorativo à direita, como a seta de "abre a tela". */
  trailing?: ReactNode;
  /**
   * Controle à direita que é **ação** — o botão de apagar de um caminho.
   *
   * Fica fora da área tocável da linha de propósito: dentro do `Pressable` da
   * linha ele vira um botão dentro de outro botão, e o leitor de tela trata o
   * conteúdo da linha como rótulo do botão externo — o botão interno some da
   * navegação por VoiceOver e TalkBack. `trailing` continua sendo o lugar do
   * enfeite, que não recebe toque próprio.
   */
  trailingAction?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
};

/**
 * Linha de lista. Serve para eventos, para navegações e para caminhos, com o mesmo
 * formato: ícone opcional, título, descrição e algo à direita.
 *
 * `trailing` e `trailingAction` são separados pelo que acontece no toque, não pela
 * posição: o enfeite acompanha a linha e a ação tem o seu próprio alvo.
 */
export function ListRow({
  title,
  description,
  meta,
  icon,
  trailing,
  trailingAction,
  onPress,
  accessibilityLabel,
  className,
}: ListRowProps) {
  const content = (
    <View className={rowVariants({ className })}>
      {icon ? <View>{icon}</View> : null}

      <View className="flex-1 gap-1">
        <Text variant="subheading" numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {meta ? <Text variant="caption">{meta}</Text> : null}
      </View>

      {trailing}
    </View>
  );

  if (!onPress) {
    return (
      <View className="flex-row items-stretch gap-3">
        <View className="flex-1">{content}</View>
        {trailingAction}
      </View>
    );
  }

  return (
    <View className="flex-row items-stretch gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        onPress={onPress}
        className="flex-1 rounded-lg active:opacity-70"
      >
        {content}
      </Pressable>
      {trailingAction}
    </View>
  );
}

const rowVariants = tv({
  base: 'flex-row items-center gap-3 rounded-lg border border-border bg-background p-4',
});
