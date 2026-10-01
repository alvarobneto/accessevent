# Accessibility Navigator — Design System

## Objetivo

Este documento define os padrões visuais e de experiência da aplicação. Todas as telas, componentes e fluxos devem seguir estas diretrizes para manter consistência, acessibilidade e qualidade visual.

---

# Identidade da Marca

## Missão

Ajudar pessoas a navegar por ambientes urbanos com mais autonomia, segurança e confiança.

## Sensações que a interface deve transmitir

- Segurança
- Clareza
- Inclusão
- Confiança
- Calma
- Autonomia

## Evitar

- Aparência hospitalar
- Visual corporativo excessivamente sério
- Interfaces carregadas
- Excesso de cores
- Excesso de sombras
- Muitos elementos simultâneos na tela

---

# Personalidade Visual

## Palavras-chave

- Moderna
- Humana
- Acessível
- Simples
- Confiável
- Amigável

## Referências

- Apple Maps
- Google Maps
- Citymapper
- Headspace
- Duolingo (pela simplicidade visual)

---

# Tipografia

## Fonte Principal

```txt
Inter
```

### Pesos permitidos

```txt
400 - Regular
500 - Medium
600 - SemiBold
700 - Bold
```

Evitar pesos mais finos ou mais pesados.

---

# Escala Tipográfica

```ts
export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700",
  },

  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
  },

  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
  },

  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
  },

  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },

  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },

  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },

  small: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "400",
  },
};
```

---

# Paleta de Cores

## Cor Primária

Azul confiável e acessível.

```ts
primary = "#2563EB"
```

---

## Escala Primária

```ts
primary50  = "#EFF6FF"
primary100 = "#DBEAFE"
primary200 = "#BFDBFE"
primary300 = "#93C5FD"
primary400 = "#60A5FA"
primary500 = "#3B82F6"
primary600 = "#2563EB"
primary700 = "#1D4ED8"
primary800 = "#1E40AF"
primary900 = "#1E3A8A"
```

---

## Escala Neutra

```ts
gray50  = "#F8FAFC"
gray100 = "#F1F5F9"
gray200 = "#E2E8F0"
gray300 = "#CBD5E1"
gray400 = "#94A3B8"
gray500 = "#64748B"
gray600 = "#475569"
gray700 = "#334155"
gray800 = "#1E293B"
gray900 = "#0F172A"
```

---

## Cores Semânticas

### Sucesso

```ts
success = "#16A34A"
```

### Atenção

```ts
warning = "#F59E0B"
```

### Erro

```ts
error = "#DC2626"
```

### Informação

```ts
info = "#0284C7"
```

---

# Tema Base

```ts
export const colors = {
  background: "#FFFFFF",
  surface: "#F8FAFC",

  primary: "#2563EB",

  text: "#0F172A",
  textSecondary: "#475569",

  border: "#E2E8F0",

  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
  info: "#0284C7",
};
```

---

# Espaçamentos

Utilizar múltiplos de 4.

```ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};
```

---

# Layout

## Padding Horizontal Padrão

```ts
20px
```

Todas as telas devem iniciar com:

```tsx
paddingHorizontal: 20
```

---

## Espaçamento Vertical

Entre seções:

```ts
24px
```

Entre componentes relacionados:

```ts
16px
```

Entre elementos internos:

```ts
8px
```

---

# Border Radius

```ts
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};
```

---

# Sombras

Sombras discretas.

```ts
shadow-sm
shadow-md
```

Evitar:

- sombras grandes
- sombras escuras
- múltiplas sombras

---

# Botões

## Primary

Uso principal da tela.

```txt
Fundo azul
Texto branco
```

---

## Secondary

```txt
Fundo azul claro
Texto azul escuro
```

---

## Ghost

```txt
Sem fundo
Texto azul
```

---

## Danger

```txt
Fundo vermelho
Texto branco
```

---

# Cards

Todos os cards devem utilizar:

```ts
backgroundColor: "#FFFFFF"
borderRadius: 16
padding: 16
borderWidth: 1
borderColor: gray200
```

---

# Inputs

Estados obrigatórios:

- Default
- Focus
- Error
- Disabled

### Focus

```ts
borderColor: primary
```

### Error

```ts
borderColor: error
```

---

# Ícones

Biblioteca recomendada:

```txt
Lucide React Native
```

Tamanho padrão:

```ts
20
24
32
```

Evitar tamanhos arbitrários.

---

# Acessibilidade

## Contraste

Todo texto deve atingir pelo menos:

```txt
WCAG AA
```

---

## Área de Toque

Botões e elementos clicáveis:

```ts
mínimo: 44x44
ideal: 48x48
```

---

## Texto

Evitar textos menores que:

```ts
14px
```

---

## Feedback

Toda ação importante deve possuir:

- Feedback visual
- Estado de carregamento
- Estado de erro
- Estado vazio

---

# Animações

Utilizar animações curtas.

### Duração

```ts
150ms
250ms
300ms
```

Evitar animações longas.

---

# Dark Mode

Estruturar a aplicação para suportar Dark Mode futuramente.

Nenhuma cor deve ser utilizada diretamente nas telas.

Sempre utilizar tokens do tema.

---

# Regras Obrigatórias

- Nunca utilizar cores hardcoded dentro de componentes.
- Nunca utilizar valores mágicos de espaçamento.
- Utilizar apenas tokens do tema.
- Utilizar apenas componentes compartilhados para botões, inputs e cards.
- Priorizar legibilidade acima de estética.
- Priorizar acessibilidade acima de efeitos visuais.
- Manter consistência visual em todas as telas.
- Qualquer novo componente deve seguir este Design System.