import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';

import { tv } from '../lib/tv';

type SectionProps = {
  /** Opcional quando o cabeçalho da tela já mostra o título. */
  title?: string;
  description?: string;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Agrupador de conteúdo: título pequeno, descrição opcional e o bloco abaixo. */
export function Section({ title, description, trailing, children, className }: SectionProps) {
  return (
    <View className={sectionVariants({ className })}>
      {title || description || trailing ? (
        <View className="flex-row items-end justify-between gap-3">
          <View className="flex-1 gap-1">
            {title ? <Text variant="label">{title}</Text> : null}
            {description ? <Text variant="caption">{description}</Text> : null}
          </View>
          {trailing}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const sectionVariants = tv({
  base: 'gap-3',
});
