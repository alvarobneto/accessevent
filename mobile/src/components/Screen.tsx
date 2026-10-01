import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tv, type VariantProps } from '../lib/tv';

type ScreenProps = VariantProps<typeof screenVariants> & {
  children: ReactNode;
  /** Role a rolagem quando o conteúdo não couber na tela. */
  scrollable?: boolean;
  className?: string;
  testID?: string;
  /** Espaçamento interno; o padrão dá respiro lateral e vertical. */
  contentClassName?: string;
};

/**
 * Casca das telas: fundo neutro, áreas seguras respeitadas e o mesmo respiro
 * horizontal em todas as telas.
 *
 * O padrão implementa o `paddingHorizontal: 20` do `design.md` e o ritmo vertical
 * de 24px entre seções, 16px entre componentes relacionados e 8px entre elementos
 * internos.
 */
export function Screen({
  children,
  scrollable,
  variant = 'canvas',
  className,
  contentClassName,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const containerClass = screenVariants({ variant, className });

  if (!scrollable) {
    return (
      <View className={containerClass} testID={testID}>
        <View className={contentClassName ?? 'gap-6 px-5 py-5'}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      testID={testID}
      className={containerClass}
      contentContainerClassName={contentClassName ?? 'gap-6 px-5 py-5 pb-8'}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ paddingBottom: insets.bottom }}
    >
      {children}
    </ScrollView>
  );
}

const screenVariants = tv({
  base: 'flex-1',
  variants: {
    variant: {
      canvas: 'bg-surface',
      background: 'bg-background',
    },
  },
  defaultVariants: {
    variant: 'canvas',
  },
});
