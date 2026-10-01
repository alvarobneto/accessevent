/**
 * Ponte entre os design tokens e o Tailwind.
 *
 * Os valores NÃO vivem aqui: estão em `src/theme/tokens.js`, que é a fonte de
 * verdade e a especificação é o `design.md` na raiz do repositório. Este arquivo
 * só expõe os mesmos tokens como `theme` para que os componentes possam escrevê
 * com `className` (`text-h2`, `bg-surface`, `rounded-lg`, `shadow-sm`).
 *
 * Duas decisões que fogem do documento e estão registradas no `AGENTS.md`:
 *
 * - Os tons `success-strong`, `warning-strong`, `error-strong` e `info-strong`
 *   são tons escuros derivados das cores semânticas do `design.md`. Os tons do
 *   documento preenchem fundo, borda e ícone; quando a mesma cor vira texto
 *   sobre fundo claro, ela não atinge WCAG AA, e o `design.md` exige AA para
 *   todo texto.
 * - Ícones seguem `@expo/vector-icons`, não Lucide, por causa da regra de
 *   preferir a solução oficial do Expo.
 *
 * Contraste conferido contra o fundo claro (WCAG AA pede 4,5:1 para texto):
 *
 * | token             | sobre branco | sobre `surface` | uso                       |
 * | ----------------- | -----------: | --------------: | ------------------------- |
 * | `content`         |       17,85:1 |         17,06:1 | texto padrão              |
 * | `muted`           |        7,58:1 |          7,24:1 | texto secundário          |
 * | `primary`         |        5,17:1 |          4,94:1 | ação principal, links     |
 * | `primary-700`     |        6,70:1 |          6,41:1 | rótulo sobre `primary-50` |
 * | `success-strong`  |        7,13:1 |          6,81:1 | texto de sucesso          |
 * | `warning-strong`  |        7,09:1 |          6,78:1 | texto de aviso            |
 * | `error-strong`    |        6,47:1 |          6,18:1 | texto de erro             |
 * | `info-strong`     |        5,93:1 |          5,67:1 | texto informativo         |
 *
 * `success`, `warning` e `info` ficam entre 3,30:1 e 2,15:1 sobre branco — por
 * isso nunca são usados como cor de texto, só como preenchimento, borda e ícone.
 */
const { colors, fontSize } = require('./src/theme/tokens.js');

/**
 * Escala de espaçamento em pixels, com passo de 4px — o múltiplo de 4 exigido
 * pelo `design.md`.
 *
 * Fica em `px` de propósito: o runtime do NativeWind usa 14px como base de
 * `rem`, então um utilitário como `h-10` resolveria 35px em vez de 40px e todo
 * o layout encolheria 12,5%. Fixando a escala em pixels, espaçamento, padding e
 * gaps seguem exatamente a grade pretendida.
 *
 * Os passos canônicos do documento são `xs` 4, `sm` 8, `md` 16, `lg` 24,
 * `xl` 32, `xxl` 48 e `xxxl` 64 — ou seja, `p-1`, `p-2`, `p-4`, `p-6`, `p-8`,
 * `p-12` e `p-16`. O `paddingHorizontal: 20` exigido para as telas é `px-5`, e
 * os alvos de toque de 44/48px são `size-11`/`size-12`.
 */
const spacing = {
  ...Object.fromEntries(Array.from({ length: 97 }, (_, step) => [`${step}`, `${step * 4}px`])),
  px: '1px',
};

module.exports = {
  presets: [require('nativewind/preset')],
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    /**
     * Escala tipográfica do `design.md`, espelhada de `src/theme/tokens.js`.
     *
     * Substitui a escala padrão do Tailwind em vez de estendê-la: um `text-xs`
     * deixado por engano não renderiza 12px silenciosamente, simplesmente não
     * produz nenhuma regra. A justificativa do piso de 14px está no token.
     *
     * Os nomes também são consumidos por `src/lib/tv.ts`, então renomear um
     * tamanho aqui tem efeito nos dois lugares de uma vez.
     */
    fontSize,
    extend: {
      colors: {
        transparent: colors.transparent,

        /** Azul da marca. `primary` é o tom base; a escala cobre tonal e bordas. */
        primary: {
          DEFAULT: colors.primary,
          50: colors.primary50,
          100: colors.primary100,
          200: colors.primary200,
          300: colors.primary300,
          400: colors.primary400,
          500: colors.primary500,
          600: colors.primary600,
          700: colors.primary700,
          800: colors.primary800,
          900: colors.primary900,
        },

        /** Neutros frios: fundo, superfície, bordas e texto. */
        gray: {
          50: colors.gray50,
          100: colors.gray100,
          200: colors.gray200,
          300: colors.gray300,
          400: colors.gray400,
          500: colors.gray500,
          600: colors.gray600,
          700: colors.gray700,
          800: colors.gray800,
          900: colors.gray900,
        },

        /** Estados. `DEFAULT` preenche, borda e pinta ícone; `strong` é texto. */
        success: { DEFAULT: colors.success, strong: colors.successStrong },
        warning: { DEFAULT: colors.warning, strong: colors.warningStrong },
        error: { DEFAULT: colors.error, strong: colors.errorStrong },
        info: { DEFAULT: colors.info, strong: colors.infoStrong },

        /** Papéis do tema, nomeados como o `design.md` os nomeia. */
        background: colors.background,
        surface: colors.surface,
        content: colors.content,
        muted: colors.muted,
        border: colors.border,
      },

      /**
       * Inter. Cada peso é uma família registrada pelo `expo-font`, então
       * `font-medium` resolve para `Inter_500Medium` *e* para `font-weight: 500`.
       */
      fontFamily: {
        regular: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },

      /** Sombras discretas: duas, e só duas. Nada de sombra grande ou escura. */
      boxShadow: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.05)',
        md: '0 2px 6px rgba(15, 23, 42, 0.06), 0 12px 24px rgba(15, 23, 42, 0.10)',
      },

      /** Larguras de conteúdo, para substituir valores arbitrários nos textos. */
      maxWidth: {
        xs: '260px',
        sm: '320px',
        md: '420px',
      },

      spacing,
    },
  },
  plugins: [],
};
