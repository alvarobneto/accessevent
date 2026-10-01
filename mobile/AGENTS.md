This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Every file under `src/app/` is a route; `_layout.tsx` files define the navigators. Keep non-route code (components, hooks, services, utils) outside `src/app/`.
- Import `Link`, `router`, `useLocalSearchParams`, and `Stack`/`Tabs` from `expo-router`. Do **not** hand-roll navigators with React Navigation — Expo Router already wraps it, and deep links come for free.
- `typedRoutes` é habilitado, mas a checagem é **parcial**: o tipo union gerado em
  `.expo/types/router.d.ts` só rejeita strings literais. Uma navegação com segmento dinâmico
  (``router.push(`/organizer/event/${id}/edit`)``) **passa mesmo com rota inexistente**, porque o
  tipo `SingleRoutePart<T>` é genérico e o TypeScript não consegue estreitar o que vem depois do
  `${}` — hoje são 8 chamadas dinâmicas e 8 literais no app. Trate rotas dinâmicas como revisão
  manual; prefira `router.push({ pathname: '/organizer/event/[eventId]/edit', params: { eventId: id } })`
  quando quiser o segmento parametrizado checado. Os tipos são gerados pelo dev server: rode
  `npx expo start` uma vez depois de criar ou renomear uma rota, senão `.expo/types/router.d.ts`
  fica desatualizado e o `typecheck` valida um conjunto de rotas antigo.
- Docs: https://docs.expo.dev/router/introduction.md

## Project structure

```text
src/
├── app/            # Expo Router routes — every file here is a screen
│   ├── _layout.tsx # root navigator
│   ├── index.tsx   # escolha do modo de uso (organizador ou usuário)
│   ├── organizer/  # área do organizador: eventos, gerenciar evento, editor
│   ├── user/       # área do usuário: eventos, navegações, mapa
│   └── diagnostics.tsx # Sprint 0 (fora do fluxo, acessado por deep link)
├── components/     # camada de UI compartilhada
│   ├── ui/         # primitivos (Button, Card, Input, DateField, Menu, Alert, Dialog, Text, Icon…)
│   ├── screen.tsx    # shell com SafeArea + scroll opcional
│   ├── section.tsx   # título + ação de seção
│   └── async-content.tsx # estados loading/error/empty de listas
├── config/         # env access — process.env must be read statically (expo/no-dynamic-env-var)
├── data/           # AppRepository + implementação em memória (types, repository, inMemoryRepository)
├── hooks/          # reusable data/logic hooks
├── services/       # API client, health, location
├── theme/          # design tokens em JS (fonte de verdade) + tipos
├── types/          # shared types that do not belong to data/
└── utils/          # formatting and error helpers
```

User-facing strings are pt-BR; identifiers are English. The app's own UI must stay accessible
(RNF04) — touch targets are the 44px/48px pair from the spacing scale (`size-11`/`size-12`, and
`min-h-11`/`min-h-12`/`min-h-14` on controls), and the contrast ratios of the color tokens are
documented in `src/theme/tokens.js`.

## UI: NativeWind + camada local no estilo Reusables

Toda a interface é escrita com `className` do NativeWind, e os tokens seguem o **`design.md` na raiz
do repositório** — paleta, escala tipográfica, passo de espaçamento, raios, sombras e estados de
input. As telas nunca escrevem cores ou tamanhos literais: elas usam utilitários (`text-h2`,
`bg-surface`, `rounded-lg`, `shadow-sm`).

Os tokens têm uma fonte única de verdade em `src/theme/tokens.js`, e `tailwind.config.js` apenas os
espelha para gerar os utilitários — nenhum valor é escrito duas vezes. O módulo em JS existe porque
parte da interface não aceita `className` e pediria cor literal: `ActivityIndicator`,
`selectionColor`/`placeholderTextColor` do `TextInput`, a cor de `MaterialCommunityIcons` e o
`screenOptions` do Expo Router. Sem ele, o `design.md` proíbe (hex espalhado pelo app) seria
violado nessas poucas APIs.

```text
mobile/
├── tailwind.config.js   # ponte que espelha os tokens para o Tailwind
├── global.css           # @tailwind base/components/utilities (importado no _layout raiz)
├── nativewind-env.d.ts  # tipos de className
├── babel.config.js      # jsxImportSource: nativewind
├── metro.config.js      # withNativeWind
└── src/theme/
    ├── tokens.js        # design tokens — fonte de verdade
    └── tokens.d.ts      # tipos TypeScript do módulo JS
```

- `react-native-reusables` **não está disponível** (o pacote retorna 404 no npm e o repositório
  não é acessível), então `src/components/ui/` é uma camada própria com a mesma ergonomia —
  variantes compostas via `tailwind-variants`, props explícitas, `forwardRef`, `accessibilityLabel`
  e alvos de toque grandes. Se o pacote voltar ao registry, trocar a implementação interna da
  camada não muda nenhuma tela.
- **Espaçamento em pixels, de propósito.** O runtime do NativeWind usa 14px como base de `rem`, então
  a escala padrão do Tailwind resolveria `h-10` como 35px. A escala em `tailwind.config.js` é
  gerada em px (passo de 4px) para manter o layout no tamanho projetado. O `design.md` define
  `paddingHorizontal: 20` em todas as telas, então `px-5` é o respiro lateral padrão.
- Tokens novos entram em `src/theme/tokens.js` com o contraste conferido — nunca em `style={{}}`, e
  `tailwind.config.js` importa desse arquivo para não duplicar valores.
- **`tv` vem de `src/lib/tv.ts`, nunca de `tailwind-variants` direto.** Nossas cores são `text-*` e
  nossos tamanhos também (`text-body`, `text-h2`), porque a escala do `design.md` não usa os nomes
  padrão do Tailwind. O `tailwind-variants` decide se duas classes se anulam comparando os nomes com a
  lista de grupos do Tailwind, onde só entram `text-sm`/`text-base`/`text-lg`. Nomes fora dessa lista
  caem no mesmo grupo das cores, o conflito é resolvido por "último vence", e o resultado é silencioso:
  o tamanho desaparece e a cor sobrevive, ou o inverso — um `Button` azul com o rótulo escuro e todo o
  `Text` no tamanho padrão do sistema. `src/lib/tv.ts` registra a escala como grupo de tamanho e tira os
  nomes do mesmo token `fontSize` que alimenta o `theme.fontSize` do Tailwind, então os dois não podem
  divergir. Um tamanho novo no token entra nos dois lugares; um tamanho removido não deixa sobra.
  - Vale o mesmo para `variant`/`size` que não têm default: o `Button` e o `Input` repassam o valor cru
    para as variantes compostas, então o default fica na assinatura do componente (`size = 'lg'`), e
    não só em `defaultVariants`. Sem isso o `contentVariants({ size })` recebe `undefined` e o botão
    perde a altura mínima.

### Decisões de design que fogem do `design.md` (e por quê)

Estas três foram decisões de equipe, então ficam registradas aqui para que a fonte de verdade não
divirja da implementação:

- **Ícones seguem `@expo/vector-icons`, não Lucide React Native.** O `design.md` sugere Lucide, mas a
  regra do repositório é preferir a solução oficial do Expo, e `@expo/vector-icons` já é o pacote
  oficial, instalado e centralizado em `src/components/ui/icon.tsx`. Todos os tamanhos de ícone
  foram normalizados nos três valores do design: 20, 24 e 32.
- **Inter via `@expo-google-fonts/inter`**, com os quatro pesos (`400/500/600/700`) importados por
  subpath a partir de `src/app/_layout.tsx`. O índice do pacote reexporta os 18 arquivos da família e
  o Metro embutiria ~5 MB de fontes que o app nunca carrega; importar por peso mantém só os quatro.
- **Piso de texto de 14px.** A escala tipográfica do `design.md` define `small` com 12px, mas a seção
  de Acessibilidade proíbe texto abaixo de 14px. A regra de acessibilidade vence: a escala em
  `tailwind.config.js` **substitui** a padrão do Tailwind (em vez de estendê-la), então `text-xs` não
  produz nenhuma regra em vez de renderizar 12px em silêncio. `caption` (14/20) é o menor tamanho
  renderizado.

### Contraste

O `design.md` exige WCAG AA para todo texto, mas os tons semânticos que ele define não fecham esse
nível sobre fundo claro: `success` fica em 3,30:1, `warning` em 2,15:1 e `info` em 4,10:1 sobre
branco. Por isso existem `success-strong` (`#166534`), `warning-strong` (`#92400E`), `error-strong`
(`#B91C1C`) e `info-strong` (`#0369A1`), derivados escurecidos que fecham entre 5,9:1 e 7,1:1. A
regra de uso: **cor cheia para preenchimento, borda e ícone; tom `strong` para texto**. A tabela de
contrastes está em `src/theme/tokens.js`.

## Navegação dentro das seções

- O cabeçalho nativo (`headerLeft`/`headerRight` em `organizer/_layout.tsx` e `user/_layout.tsx`) é o
  único ponto de navegação: voltar à esquerda (`arrow-left`) e trocar de modo à direita
  (`account-switch-outline`). Os componentes ficam em `src/components/header-actions.tsx`.
- **Não** repita a troca de modo como card/CTA dentro das telas — a ação vive só no cabeçalho.
- Telas raiz (`/organizer`, `/user`) sobrescrevem `headerLeft` com `() => null`: não há tela anterior
  porque a entrada na seção usa `router.replace`.
- Telas internas não repetem o título que o cabeçalho já mostra; mostram apenas o texto de apoio.
- A troca de modo usa `router.dismissTo('/')`: dentro de uma tela aninhada ela sobe até `/`, e na raiz
  substitui a seção inteira — `router.replace('/')` resolveria dentro da pilha da seção.
- `Stack.Screen` sobrescreve `headerRight` inteiro. Uma tela que tenha ação própria monta
  `HeaderActions` de `src/components/header-actions.tsx` com a ação como `children`, em vez de
  repetir o botão de troca de modo.
- **Item de lista abre, menu edita.** Um item de lista leva para a tela da coisa; ver os dados
  novamente ou editá-los é ação do menu de três pontinhos do cabeçalho (`src/components/ui/menu.tsx`,
  que é o `MenuView` do `@expo/ui`). Isso vale para eventos e para navegações, e vale para os dois
  lados: nenhum item de lista abre direto no editor. Editar dado direto da lista mostrava um editor
  sem contexto e escondia o resto do que a tela mostra.
- **A tela do dia a dia não mostra os dados da coisa; os dados têm tela própria.** Evento e
  navegação seguem a mesma forma: descrição, período e datas vão para `/details`, e a tela que o
  item da lista abriu fica com o que a coisa _é_ (as navegações de um evento, o mapa de uma
  navegação). Sem essa separação o mesmo dado aparecia inline em uma tela e em outra não — o que
  fazia a navegação parecer errada.
- As telas de detalhes dos dois lados são o mesmo componente de conteúdo
  (`EventDetailsView`, `NavigationDetailsView`): o que muda entre organizador e participante é o
  que dá para _fazer_ com os dados, e isso mora no menu, não no corpo da tela.
- O modo do menu vem de `MenuMode` (`src/components/event-menu.tsx`) e é o que monta o caminho de
  `/details` e decide se "Editar" existe. No participante só há "Ver detalhes"; na própria tela de
  detalhes não há "Ver detalhes", para não empilhar a mesma tela duas vezes.
- **Caminho de rota tem que continuar template literal dentro do `router.push`.** O `Href` gerado
  pelo Expo Router só aceita template com prefixo literal; extrair o caminho para uma variável o
  vira `string` e o `typecheck` recusa. Por isso os menus montam o ternário do modo dentro do
  `onSelect`.

## Navigation map (Sprint 1)

```text
/                        Escolha do modo de uso (sem login)
/organizer               Eventos do organizador + "Criar evento"
/organizer/event/new     Criar evento
/organizer/event/[eventId]              Gerenciar evento: criar navegação e visualizar navegações
/organizer/event/[eventId]/details      Detalhes do evento (descrição, período, criado/atualizado em)
/organizer/event/[eventId]/edit         Editar evento
/organizer/event/[eventId]/map/new      Criar navegação
/organizer/event/[eventId]/map/[mapId]  Gerenciar navegação (o que vem a seguir; mapa e POIs nas Sprints 3, 5 a 8)
/organizer/event/[eventId]/map/[mapId]/details  Detalhes da navegação (criada/atualizada em)
/organizer/map/[mapId]                  Editar navegação (título; mapa e POIs nas Sprints 3, 5 a 8)
/user                    Eventos para consulta
/user/event/[eventId]      Navegações do evento
/user/event/[eventId]/details  Detalhes do evento (mesmos dados, sem edição)
/user/map/[mapId]          Mapa da navegação
/user/map/[mapId]/details  Detalhes do mapa
/diagnostics             Sprint 0: health do backend + permissão de localização (deep link)
```

Detalhes da navegação é aninhado no evento no organizador porque a tela da navegação também é
(`/organizer/event/[eventId]/map/[mapId]`). No participante o mapa é `/user/map/[mapId]`, sem o
evento no caminho, então os detalhes são `/user/map/[mapId]/details`. A regra é a mesma: fica do
lado da tela que descreve.

## Data layer

`src/data/repository.ts` define `AppRepository` (async: `listEvents`, `createEvent`, `getEvent`,
`updateEvent`, `listNavigationMaps`, `createNavigationMap`, `getNavigationMap`,
`renameNavigationMap`). O singleton exportado por `src/data/index.ts` escolhe a implementação por
`EXPO_PUBLIC_DATA_SOURCE`:

- `api` (padrão) → `createHttpRepository()`, que fala com o NestJS em `EXPO_PUBLIC_API_URL`.
- `memory` → `createInMemoryRepository()`, o protótipo da Sprint 1: os dados vivem no escopo do
  módulo, sobrevivem à navegação mas são perdidos ao fechar o app.

As telas importam só `repository`, então trocar de fonte (ou adicionar persistência local do RNF05
atrás de `src/data/`) não toca em nenhuma tela. Erros da API chegam como `ApiError`, que extrai a
mensagem pt-BR do corpo NestJS — as telas exibem esse texto em vez de uma mensagem genérica.

The prototype has no authentication and a single organizer: the role chosen on `/` only decides
which stack opens (`router.replace`), there is no session, no permission check and no server.

Accessibility data is organizer-reported: never present a route as "safe" or "ideal".

## Dependencies added and why

- `nativewind` + `tailwindcss` — styling da interface inteira; `tailwind.config.js` espelha os
  tokens de `src/theme/tokens.js` para gerar os utilitários.
- `tailwind-variants` — variantes compostas dos primitivos de `src/components/ui/`.
- `react-native-reanimated` + `react-native-worklets` — peer requirements do NativeWind 4; animações
  de transição e de entrada de tela.
- `react-native-safe-area-context` — área segura do `Screen` e dos headers.
- `babel-preset-expo` (dev) — precisa de `jsxImportSource: "nativewind"` para o Babel resolver
  `className`.
- `prettier-plugin-tailwindcss` (dev) — ordena as classes no `npm run format`.
- `@expo/vector-icons` — official Expo package, used for the menu and empty-state icons.
- `expo-font` — required peer of `@expo/vector-icons`, e é também o que carrega a Inter; declarado
  como plugin em `app.json`.
- `@expo-google-fonts/inter` — a Inter, fonte definida no `design.md`. Só os pesos `400/500/600/700`
  são importados, por subpath, para não embarcar os 18 arquivos da família no bundle.
- `@react-native-async-storage/async-storage` — removed. The prototype must not persist anything;
  it comes back in RNF05 behind `src/data/` when recorded paths need to survive app restarts.
- `@expo/ui` — pacote oficial do Expo, usado em dois primitivos de `src/components/ui/`, que são
  componentes nativos e não JavaScript:
  - `@expo/ui/community/datetime-picker` no `DateField` — `DateTimePicker` com a API do
    `@react-native-community/datetimepicker`, que é SwiftUI `DatePicker` no iOS e o calendário do
    Material 3 no Android. O app **não** usa `@react-native-community/datetimepicker` diretamente
    justamente porque o `@expo/ui` é a opção oficial do mesmo componente.
  - `@expo/ui/community/menu` no `Menu` — `MenuView` com a API do `@react-native-menu/menu`: SwiftUI
    `Menu` no iOS e `DropdownMenu` do Material 3 no Android, ou seja, o dropdown que o sistema já
    desenha. Escrever o painel em JavaScript exigiria um `Modal`, medir a âncora e ainda ficaria com
    cara de app web.

  Em ambos os casos a alternativa seria uma biblioteca da comunidade equivalente, o que a regra do
  repositório não prefere. `@expo/ui` não traz config plugin: ele entra por autolinking, então uma
  dependência nativa nova exige um novo build de desenvolvimento, que o app já exige por causa de
  `react-native-maps` e `expo-camera`.

## Datas

- O seletor de data é sempre o nativo. Não reintroduza máscara `dd/mm/aaaa` em `TextInput`: o
  calendário não deixa o usuário escrever `31/02`, que é exatamente o que a máscara deixava passar.
- O valor trafega em `YYYY-MM-DD` dentro do formulário — o mesmo formato da API — e vira `Date` só
  para mostrar o calendário. `utils/format.ts` tem `toIsoDate`/`fromIsoDate` para essa borda.
- O iOS não tem `presentation="dialog"`: o `DateTimePicker` é sempre inline, então o `DateField` o
  coloca num `Modal` próprio com "Limpar" e "Concluir". Sem esses dois botões não haveria como fechar
  nem como limpar um campo opcional.
- **Não passe `minimumDate`/`maximumDate` para o `DateField`.** No `DateTimePicker` do `@expo/ui`
  elas viram o `range` do `DatePicker` do SwiftUI, e um `range` troca o calendário por um seletor de
  intervalo com duas alças — em iOS, não em Android. Regras de faixa de data ficam na validação do
  formulário, que se comporta igual nas duas plataformas.

## Inputs controlados

- **Não reescreva o valor dentro do `onChangeText`.** No iOS o texto nativo do campo é a fonte da
  verdade da posição do cursor; devolver um valor diferente do que o teclado produz desincroniza os
  dois, e a tecla seguinte entra num deslocamento antigo — digitar "rec" no nome do evento virava
  "Rrec". Deixe a capitalização com a plataforma (`autoCapitalize`) e grave o texto como veio.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- **Prefer the official Expo solution.** Whenever the Expo ecosystem provides a module or API for a problem, use it instead of a third-party library — Expo Router over hand-rolled React Navigation, `expo-location` over bare geolocation packages, `expo-camera` over bare camera packages, `expo-secure-store` over keychain wrappers. Reach for an external library only when the Expo ecosystem has no adequate option, or when there is a clear technical justification recorded in this file.
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
