import { createTV, type VariantProps } from 'tailwind-variants';

import { fontSize } from '../theme/tokens';

export type { VariantProps };

/**
 * Nomes dos tamanhos da escala tipográfica, tirados do mesmo token que alimenta
 * o `theme.fontSize` do Tailwind.
 */
const FONT_SIZE_TOKENS = Object.keys(fontSize);

/**
 * `tailwind-variants` decide se duas classes se anulam comparando os nomes delas
 * com a lista de grupos do Tailwind (`bg-*`, `text-*`, `p-*`…). Ele só conhece
 * os nomes **padrão** do Tailwind — `text-sm`, `text-base`, `text-lg`.
 *
 * Nossas cores também são `text-*` (`text-content`, `text-white`, `text-muted`)
 * e, como a escala tipográfica do `design.md` é `display`/`h1`/`h2`/`h3`/`body`/
 * `caption`, os tamanhos viram `text-body`, `text-h2`… Nomes fora da lista
 * padrão caem no mesmo grupo das cores, e então o conflito é resolvido por
 *último vence. O resultado era silencioso e invisível na revisão de código:
 *
 * ```text
 * textVariants({ variant: 'caption', tint: 'info' })  ->  "font-regular text-info-strong"
 * ```
 *
 * O tamanho sumiu e sobrou só a cor. Do mesmo jeito, no `Button`,
 * `labelVariants({ variant: 'solid', size: 'lg' })` devolvia `text-body` e
 * descartava o `text-white` — botão azul com texto escuro.
 *
 * Declarar a escala como grupo de tamanho resolve os dois casos: `text-body`
 * passa a ser tamanho, `text-white` continua cor, e nenhum dos dois se anula.
 *
 * Os nomes vêm de `fontSize` em vez de uma lista escrita aqui para que a escala
 * não possa divergir do Tailwind — um tamanho novo no token entra nos dois
 * lugares, e um tamanho removido não deixa sobra.
 */
export const tv = createTV({
  twMergeConfig: {
    extend: {
      classGroups: {
        'font-size': [{ text: ['base', ...FONT_SIZE_TOKENS] }],
      },
    },
  },
});
