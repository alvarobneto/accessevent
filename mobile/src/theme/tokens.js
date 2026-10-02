/**
 * Design tokens do AccessEvent, em tempo de execução.
 *
 * A especificação é o `design.md` na raiz do repositório.
 *
 * Este arquivo é a fonte de verdade, e o `tailwind.config.js` importa dele em vez
 * de repetir os valores. Ele existe porque parte da interface não aceita
 * `className`: a cor de `ActivityIndicator`, `selectionColor` do `TextInput`, a
 * cor de `MaterialCommunityIcons` e o `screenOptions` do Expo Router pedem uma
 * cor literal. Sem este módulo, essas poucas APIs obrigariam a espalhar hex pelo
 * app — exatamente o que o `design.md` proíbe.
 *
 * As telas nunca importam este arquivo: elas usam utilitários do Tailwind. Só os
 * primitivos de `src/components/ui/` o consomem.
 */

/** Paleta do `design.md`: escala primária, escala neutra e cores semânticas. */
const colors = {
  /** Azul da marca. `primary` é o tom base. */
  primary50: '#EFF6FF',
  primary100: '#DBEAFE',
  primary200: '#BFDBFE',
  primary300: '#93C5FD',
  primary400: '#60A5FA',
  primary500: '#3B82F6',
  primary600: '#2563EB',
  primary700: '#1D4ED8',
  primary800: '#1E40AF',
  primary900: '#1E3A8A',

  /** Neutros frios: fundo, superfície, bordas e texto. */
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  /**
   * Estados. Os tons do `design.md` preenchem fundo, borda e ícone; os tons
   * `*Strong` são o que se usa quando a cor vira texto.
   *
   * `success`, `warning` e `info` ficam entre 3,30:1 e 2,15:1 sobre branco e
   * reprovariam em WCAG AA como texto, então nunca são usados para texto — os
   * `*Strong` fecham em 7,13:1, 7,09:1 e 5,93:1.
   */
  success: '#16A34A',
  successStrong: '#166534',
  warning: '#F59E0B',
  warningStrong: '#92400E',
  error: '#DC2626',
  errorStrong: '#B91C1C',
  info: '#0284C7',
  infoStrong: '#0369A1',

  /** Papel do tema, com o nome que o `design.md` dá. */
  background: '#FFFFFF',
  surface: '#F8FAFC',
  primary: '#2563EB',
  content: '#0F172A',
  muted: '#475569',
  border: '#E2E8F0',

  white: '#FFFFFF',
  transparent: 'transparent',
};

/**
 * Passo de 4px exigido pelo `design.md`. Os passos canônicos do documento são
 * `xs` 4, `sm` 8, `md` 16, `lg` 24, `xl` 32, `xxl` 48 e `xxxl` 64.
 */
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

/** `paddingHorizontal` padrão de todas as telas. */
const screenPadding = 20;

/** Raios do `design.md`. */
const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

/**
 * Tamanho de alvo de toque. O `design.md` pede 44x44 no mínimo e 48x48 ideal.
 * Todo botão e elemento clicável do app respeita o mínimo.
 */
const touchTarget = {
  min: 44,
  ideal: 48,
};

/**
 * Escala tipográfica do `design.md`, em `[tamanhoDaLinha, alturaDaLinha]`.
 *
 * O documento define `small` com 12px, mas a seção de Acessibilidade proíbe texto
 * abaixo de 14px. A regra de acessibilidade vence: `caption` (14/20) é o menor
 * tamanho renderizado, e o nome `small` nem chega a existir na escala.
 *
 * Vive aqui, e não só no `tailwind.config.js`, porque `src/lib/tv.ts` precisa
 * conhecer **os nomes** dos tamanhos: o `tailwind-variants` só sabe resolver
 * conflito entre `text-body` (tamanho) e `text-white` (cor) se souber que `body`
 * é tamanho. Com a escala duplicada em dois arquivos, bastaria renomear um
 * tamanho em um deles para o erro voltar em silêncio — classes de tamanho
 * desaparecendo e cores sendo sobrescritas. Ver `src/lib/tv.ts`.
 */
/**
 * `16px` do `body`, repetido aqui porque um `fontSize` do Tailwind escrito como
 * número solto (`'16px'`) gera **só** `font-size`, sem `line-height` — e é
 * exatamente a ausência de `line-height` que o `Input` de linha única precisa.
 *
 * Ver `src/components/ui/input.tsx`: com `line-height` setado, o iOS ancora o
 * placeholder no fundo da caixa de linha enquanto centraliza o texto digitado na
 * altura natural da fonte, e os dois ficam em alturas diferentes. O tamanho em si
 * é o mesmo do `body`, então vem do mesmo `'16px'` e não duplica o literal.
 */
const bodyFontSize = '16px';

const fontSize = {
  display: ['32px', '40px'],
  h1: ['28px', '36px'],
  h2: ['24px', '32px'],
  h3: ['20px', '28px'],
  body: [bodyFontSize, '24px'],
  /** Mesmo tamanho do `body`, sem `line-height`. Ver o comentário acima. */
  bodyInput: bodyFontSize,
  caption: ['14px', '20px'],
};

/**
 * Esquema de cabeçalho nativo. Os três `_layout.tsx` (raiz, organizador e
 * usuário) compartilham este objeto: o `screenOptions` do Expo Router não aceita
 * `className`, então a única forma de ele não repetir cores literais é um token
 * compartilhado.
 */
const headerTheme = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: {
    color: colors.content,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    fontWeight: '600',
  },
  headerLargeTitleStyle: {
    color: colors.content,
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    fontWeight: '700',
  },
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerBlurEffect: 'systemChromeMaterial',
  contentStyle: { backgroundColor: colors.surface },
};

module.exports = { colors, spacing, screenPadding, radius, touchTarget, fontSize, headerTheme };
