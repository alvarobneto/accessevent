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
npm test                    # vitest run (src/**/*.spec.ts)
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

### Testes

`vitest`, o mesmo runner do `backend`, com `globals: true` e `"types": ["vitest/globals"]` no
`tsconfig.json`. O config é `vitest.config.mts` e usa `resolve.tsconfigPaths` — o Vite resolve
os aliases do `tsconfig.json` nativamente, então o plugin `vite-tsconfig-paths` que o `backend`
ainda usa não é necessário aqui.

O recorte é `src/**/*.spec.ts`, e é só o que é TypeScript puro: `utils/` e `types/`. Componente,
hook e tela dependem de React Native e do `expo-location`, e testá-los exigiria um ambiente de
render que o MVP não tem. **O que é puro e com regra de negócio vai para `utils/` e ganha
teste** — foi assim que os limiares do filtro de gravação ficaram em `utils/recording.ts` em vez
de dentro do hook.

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
│   ├── map/        # EventMap: base do mapa, marcadores e trajetos
│   ├── delete-action.tsx # apagar evento/navegação com confirmação (só organizador)
│   ├── path-list.tsx # caminhos registrados no hub + apagar por linha (Sprint 5)
│   ├── screen.tsx    # shell com SafeArea + scroll opcional
│   ├── section.tsx   # título + ação de seção
│   └── async-content.tsx # estados loading/error/empty de listas
├── config/         # env access — process.env must be read statically (expo/no-dynamic-env-var)
├── data/           # AppRepository + implementações http e em memória (types, repository, http, inMemory)
├── hooks/          # reusable data/logic hooks (useAsyncData, useRefreshOnFocus, usePathRecording)
├── services/       # API client, health, location
├── theme/          # design tokens em JS (fonte de verdade) + tipos
├── types/          # shared types that do not belong to data/ (coordinates, map)
└── utils/          # formatting, error, geometry and recording helpers
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
  sem contexto e escondia o resto do que a tela mostra. **A única exceção é a linha de caminho
  (`PathList`), que abre o editor do caminho** — decisão da Sprint 6, e por dois motivos que não
  valem para evento e navegação: o menu de três pontinhos é _do mapa_, não da linha, então editar
  por ele obrigaria abrir o caminho errado primeiro; e quem chega da gravação precisa renomear o
  trajeto que acabou de desenhar. O editor compensa o contexto que a regra queria preservar
  mostrando distância, pontos e data.
- **Tela que mostra dado que outra tela escreve recarrega no foco.** Uma tela de pilha do Expo
  Router não é remontada ao voltar, então `useAsyncData` — que carrega na montagem — continuaria
  exibindo o snapshot antigo. Toda tela que exibe uma lista ou um registro mutável de outra tela
  chama `useRefreshOnFocus` de `src/hooks/`: é o que faz o evento criado ou apagado aparecer e sumir
  na lista, e o que faz a tela de detalhes mostrar o título novo depois de uma edição. Sem isso o
  usuário contornava indo até a tela de escolha de modo, que monta a seção do zero.
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
- **A ação do menu espera um frame antes de navegar** (`src/components/ui/menu.tsx`). O
  `onPressAction` chega com o menu nativo ainda se fechando e quase toda ação nossa muda de tela.
  No iOS o `MenuView` do `@expo/ui` é um `UIHostingController` do SwiftUI: navegar no mesmo tick
  desmonta o controller de onde o menu se apresenta, e o iOS avisa que isso dá inset de safe area
  errado e **vira exceção em uma versão futura**. No Android o `DropdownMenu` do Material já
  fechou quando a ação chega, então o `requestAnimationFrame` não muda nada lá.
- **O array de ações do menu é memoizado pelo conteúdo** (`JSON.stringify` de `id`, `label` e
  `destructive`), não pela identidade do array. As telas montam `items` dentro do render, e um
  array novo a cada render fazia o menu nativo tentar se atualizar à toa — é o
  `updateVisibleMenuWithBlock: while no context menu is visible` que o iOS reclamava. O
  `onSelect` continua sendo procurado no `items` do render atual, que é o callback novo.
- **`headerTheme` desliga o `scrollEdgeEffects` do `react-native-screens`** (`src/theme/tokens.js`).
  A biblioteca liga o efeito de borda de rolagem por padrão (`automatic`) e avisa quando ele vem
  junto de um `blurEffect`, porque em iOS 26 os dois se sobrepõem. O `headerBlurEffect` é escolha
  nossa e vale em toda versão do iOS, então quem desliga é o efeito automático, nas quatro bordas:
  o contrário deixaria o header com aparência diferente conforme a versão do sistema.
- **Ação irreversível mora no corpo da tela, não no menu.** Apagar evento e apagar navegação usam o
  `DeleteAction` (`src/components/delete-action.tsx`), que fica no fim da tela de detalhes do
  organizador. O menu de três pontinhos é para o que se refaz; apagar não se refaz, e item de menu
  fica a um toque de distância das ações do dia a dia. O `DeleteAction` sempre confirma em `Dialog`
  destrutivo repetindo o nome do registro, bloqueia o fechamento enquanto o pedido está em voo e
  mostra o erro da API dentro do diálogo em vez de sumir com a tela. Depois do sucesso a navegação é
  `router.dismissTo(...)` para a lista — nunca `replace`, que deixaria a tela do registro apagado
  na pilha. O repositório em memória apaga a navegação junto com o evento, espelhando o
  `ON DELETE CASCADE` do Postgres.

## Navigation map (Sprint 1)

```text
/                        Escolha do modo de uso (sem login)
/organizer               Eventos do organizador + "Criar evento"
/organizer/event/new     Criar evento
/organizer/event/[eventId]              Gerenciar evento: criar navegação e visualizar navegações
/organizer/event/[eventId]/details      Detalhes do evento (descrição, período, criado/atualizado em)
/organizer/event/[eventId]/edit         Editar evento
/organizer/event/[eventId]/map/new      Criar navegação
/organizer/event/[eventId]/map/[mapId]  Gerenciar navegação: hub do mapa, caminhos registrados e "Mapear novo caminho"
/organizer/event/[eventId]/map/[mapId]/record    Gravar um caminho novo (Sprint 4)
/organizer/event/[eventId]/map/[mapId]/path/[pathId]  Editar caminho (o nome; Sprint 6)
/organizer/event/[eventId]/map/[mapId]/details  Detalhes da navegação (criada/atualizada em)
/organizer/map/[mapId]                  Editar navegação (título; caminhos e pontos nas Sprints 5 a 8)
/user                    Eventos para consulta
/user/categories           Categorias com eventos cadastrados e a contagem de cada uma
/user/categories/[category]  Eventos da categoria
/user/event/[eventId]      Navegações do evento
/user/event/[eventId]/details  Detalhes do evento (mesmos dados, sem edição)
/user/map/[mapId]          Mapa da navegação (o EventMap; caminhos e pontos nas Sprints 5 a 8)
/user/map/[mapId]/details  Detalhes do mapa
/diagnostics             Sprint 0: health do backend + permissão de localização (deep link)
```

Detalhes da navegação é aninhado no evento no organizador porque a tela da navegação também é
(`/organizer/event/[eventId]/map/[mapId]`). No participante o mapa é `/user/map/[mapId]`, sem o
evento no caminho, então os detalhes são `/user/map/[mapId]/details`. A regra é a mesma: fica do
lado da tela que descreve.

## Mapa

`react-native-maps` é o mapa do app, e o PRD §24 é quem fixa a biblioteca — o `expo-maps`, que o
Expo também mantém, fica de fora. `src/components/map/event-map.tsx` é o **único** arquivo do app
que importa `react-native-maps`: as telas passam marcadores e polilinhas e não tocam em
coordenada, provider ou câmera. Marcador e polilinha são os tipos de `src/types/map.ts`, que já
falam o idioma do banco (`PointOfInterest.position` e `Path.geometry`, PRD §23).

### Sistema de coordenadas

- **WGS84 em graus decimais** em todo o projeto: da leitura do `expo-location` até o
  `Path.geometry` gravado no Postgres, que é JSON puro — o que o PRD §25 permite para o MVP, e sem
  PostGIS. A mesma forma vale no banco, na API e no app, então não existe conversão por camadas.
- Duas formas com nomes diferentes de propósito: `Coordinates` (`src/types/coordinates.ts`) é a
  leitura do GPS, com `accuracy`; `Coordinate`, o par `[latitude, longitude]`, é o que se grava e
  se desenha. `LocationSample` é a leitura **com o instante** (`recordedAt`), que só a gravação
  precisa — é a distância dividida pelo tempo que separa uma pessoa andando de um salto do
  sensor. `toLatLng` em `src/utils/geo.ts` é a **única** conversão para o objeto
  `{latitude, longitude}` que o `react-native-maps` consome.
- `MapGeometry` é a lista de coordenadas em ordem, e é o formato que a API devolve e que o
  `Path.geometry` grava. Não invente um terceiro formato de coordenada para um caso novo.
- `regionForGeometry` enquadra tudo com 0,003° de folga e piso de 0,002° (≈220 m): um mapa de
  pavilhão quase sempre tem um único ponto, e sem o piso o mapa abriria no zoom do planeta.
  `regionForCoordinate` é a câmera fixa que acompanha quem percorre o local (Sprint 4).
- `isValidCoordinate` fica na borda do desenho, não espalhado pelas telas: geo do dispositivo,
  resposta da API e trajetória gravada chegam por caminhos diferentes, e coordenada fora da faixa
  jogaria o mapa para um ponto impossível em vez de ser ignorada.
- `distanceInMeters` é a haversine, e a distância de um caminho gravado é a **soma dos trechos**:
  o organizador percorre um pavilhão, não um círculo. `degreeDistanceInMeters` existe para a
  câmera, que já chega em graus do `react-native-maps` e não passa por coordenada gravada.

### O componente

- `EventMap` reenquadra a câmera **só quando o conteúdo muda** (`describeContent`), nunca a cada
  render: um array novo com o mesmo conteúdo não tira o mapa da mão de quem está arrastando. Com o
  mapa vazio ele não inventa câmera — quem passa o `initialRegion` é a tela.
- **Quem dirige a câmera são dois jeitos, e eles não convivem.** Por padrão o componente
  reenquadra o conteúdo, o que serve para um mapa salvo. Passando `cameraToFollow` — que só tem
  efeito com `followUserLocation` — o reenquadramento automático é **desligado** e a câmera segue o
  centro que a tela manda. Isso existe porque, durante a gravação, o trajeto cresce a cada leitura
  e o `fitToCoordinates` puxaria a câmera para o centro do percurso a cada ponto: foi o que a
  primeira versão do `followUserLocation` fez, dentro do componente, e o mapa não acompanha quem
  está caminhando. A tela de gravação conduz o laço com `onCameraSettled`, que devolve o centro
  depois que a câmera para de se mexer; ela realimenta com a posição do GPS e assim o
  acompanhamento usa a mesma fórmula do `animateToRegion` do componente, sem o componente conhecer
  a leitura do sensor.
- O laço de animação tem tolerância de 1 m (`CAMERA_SETTLED_TOLERANCE_M`): a animação de 250 ms
  nunca assenta exatamente no centro pedido, e realimentar o efeito a cada quadro seria um laço de
  animações que não termina.
- `userLocation` desenha o ponto nativo de quem autorizou a localização; `followUserLocation` é o
  pedido de acompanhamento. A permissão é pedida pela tela, nunca pelo componente.
- `MapPin` desenha um disco com anel branco em vez do pino do sistema: os pinos nativos (Apple
  Maps e Google Maps) têm formato, cor e tamanho diferentes, e o `design.md` pede consistência
  entre plataformas. As três cores de tom (`default`, `highlight`, `muted`) saem de
  `src/theme/tokens.js` e fecham 3:1 ou mais contra o desenho claro do mapa.
- `tracksViewChanges={false}` no marcador: o pino é estático, e sem isso o Android redesenha o
  marcador a cada quadro. Se o pino ganhar estado (seleção na Sprint 6), essa prop volta a ser
  `true`.
- Giro e inclinação desligados: o mapa de um local interno é lido de cima, e a rotação da cena é o
  tipo de movimento que mais causa desconforto (RNF04). Zoom e arraste continuam liberados.

## Gravação de caminho (Sprint 4)

`/organizer/event/[eventId]/map/[mapId]/record` é uma rota própria, e não uma seção da tela da
navegação: gravação é tarefa com início, acompanhamento e fim, e emaranhada no hub ela empurraria
para baixo a lista de caminhos que a Sprint 5 traz. O hub (`map/[mapId]`) mostra o mapa e tem o
botão "Mapear novo caminho"; a gravação vive na rota ao lado.

- **A máquina de estado é `usePathRecording`** (`src/hooks/`): `idle` → `starting` → `recording` →
  `finished`, com `start`, `finish` e `discard`. A tela desenha e não decide; o hook não desenha.
- **A permissão é lida, não pedida e esquecida.** GPS desligado e permissão negada viram `issue`
  em pt-BR na tela e a gravação não começa. `requestLocationPermission` volta o estado, e o
  protótipo da Sprint 3 descartava esse retorno.
- **Não há pausa.** Quem percorre um pavilhão não precisa pausar o trajeto — pausa o lugar, não a
  caminhada — e a pausa criaria dois caminhos numa sessão. Interromper é `finish` ou `discard`.
  A pausa que existia no protótipo era pior que inútil: parava o cronômetro e deixava o GPS
  acrescentar ponto por baixo. Decisão registrada no PRD §9.2.
- **O filtro de leitura mora em `src/utils/recording.ts`, não no hook**, e é pura para ter teste:
  precisão acima de 30 m, espaçamento menor que 1 m e salto acima de 3 m/s entre pontos com 1 s ou
  mais de intervalo. Os limiares são o que separa o trajeto do sensor do trajeto da pessoa, e eles
  têm que entrar antes da Sprint 5 — depois que o ponto está no `Path.geometry` ele entra no
  cálculo de rota como dado (Sprint 17). As regras estão no PRD §9.2.
- **A distância mostrada é o comprimento do trajeto desenhado**, a soma dos trechos aceitos. Um
  trecho de leitura descartado não entra: as leituras ruins em sequência são todas medidas contra o
  mesmo último ponto aceito, e somá-las contaria o mesmo metro várias vezes.
- **A referência do filtro de salto só troca quando o ponto é aceito.** Se passasse a ser o ponto
  descartado, o passo seguinte pareceria outro teleporte e o trajeto nunca mais cresceria.
- **Só com o app na frente.** A assinatura é do `expo-location` em primeiro plano, então sair
  para outra tela interrompe a entrega de posição; a tela avisa isso. Background exigiria
  foreground service com notificação permanente no Android e
  `allowsBackgroundLocationUpdates` no iOS, e está fora do MVP (PRD §30).
- **Nada na gravação toca a rede**, que é o que faz o RNF05 valer sem fila: perda temporária de
  conexão não interrompe o mapeamento.
- **`finalize` fecha o trajeto; gravar é uma confirmação à parte.** A tela de resumo
  mostra tempo, distância e contagem de pontos, e o botão "Salvar no mapa" faz o
  `POST /paths`. Antes de confirmar, o caminho existe só em memória: foi a decisão
  para que uma gravação acidental não vire linha no banco sem a pessoa pedir. O
  erro do `ApiError` aparece na tela e o trajeto continua em memória, para tentar de
  novo sem percorrer o local outra vez. Um trajeto com menos de dois pontos nem
  habilita o botão.
- **A distância não vai no corpo do `POST`.** A API deriva o valor da geometria e
  devolve o caminho salvo — o que a tela mostra e o que fica gravado vêm da mesma
  conta, e o cálculo de rota da Sprint 16 ordena distâncias. `geometryLengthInMeters`
  em `utils/geo.ts` existe para o repositório em memória concordar com a API; a
  gravação **não** usa a função, porque somar trecho a trecho a cada leitura é o que
  mantém o cálculo linear no tamanho do trajeto.
- `watchPosition` põe o callback de erro **depois** do de posição porque é a assinatura que chama:
  `watchPositionAsync(qualidades, callback, onError)`.

## Caminhos no hub (Sprint 5)

`map/[mapId]` é o hub: mostra o mapa com os caminhos já gravados, tem o botão de
gravar novo e a lista do que existe. A gravação ficou na rota ao lado, então a lista
não é empurrada para baixo por um painel de GPS.

- **Navegação e caminhos são dois `useAsyncData`**, e não um só com `Promise.all`: a
  lista falhar não pode trocar o mapa da tela por um erro, e o mapa é o conteúdo
  principal do hub. O `useRefreshOnFocus` recarrega os dois, porque quem salva é a
  tela de gravação e a tela não é remontada ao voltar.
- **A lista só desenha polilinha com dois pontos válidos.** `polylinesFromPaths`
  (`utils/mapContent.ts`, com teste) decide isso no mesmo lugar do `EventMap`, que
  filtra coordenada inválida na borda do desenho. O `tone` fica no padrão: cor de
  trajeto só muda quando existe um contexto — a rota em destaque da Sprint 18 — e
  pintar um caminho de "verde" para sugerir que ele serve seria vender o que o PRD
  §19 diz que ninguém verificou.
- **Caminho tem nome desde a Sprint 6.** A linha da lista mostra o nome que o
  organizador deu e cai para "Caminho de <distância>" quando não há nome — não
  para um título vazio nem para "sem nome", que é ausência de dado, não estado que
  a interface precise explicar. O cálculo está em `pathLabels`
  (`utils/pathLabel.ts`, com teste) e não no componente, porque é regra de
  apresentação com casos que quebram em silêncio: nome vazio, nome só com espaço,
  geometria de um ponto só.
- **Selecionar caminho tem duas portas: a linha da lista e o trajeto no mapa.** A
  lista é a que tem alvo de toque grande e nome legível; o toque no trajeto é o
  atalho de quem está olhando o desenho. O `onPress` mora em **cada** polilinha
  (`MapPolyline.onPress`), não em um callback único no `EventMap`, porque o
  `PolylinePressEvent` do `react-native-maps` só traz `id` no Google Maps do iOS —
  é opcional no tipo. O toque é despachado para a polilinha específica nas duas
  plataformas (`MapView.java` no Android faz `polylineMap.get(polyline).getId()`),
  então o fechamento por polilinha funciona igual nos dois. `tappable` só é pedido
  quando existe `onPress`, para não transformar todo trajeto em área de toque numa
  tela em que ninguém quer selecionar.
- **O trajeto do mapa é um alvo de toque fino, e isso é uma escolha consciente.**
  A linha desenhada tem 4px e o `react-native-maps` não expõe `hitSlop` no
  `Polyline`, então o alvo real do toque no mapa é o próprio traço. Dá para
  desenhar uma segunda polilinha transparente e mais grossa por baixo para
  engordar o alvo, mas isso não foi feito porque o hit-test transparente só dá
  para confirmar em aparelho, e um alvo de toque quebrado é pior do que um alvo
  pequeno. O caminho acessível para quem usa leitor de tela é a lista — por isso o
  `accessibilityLabel` do mapa fala quantos caminhos existem e a lista é a porta
  principal. Se a Sprint 7 mexer nisso, é o lugar.
- **Editar caminho é tela própria** (`/path/[pathId]`), aberta pela linha ou pelo
  trajeto, e salva por botão explícito ("Salvar alterações") em vez de a cada tecla:
  o nome é do organizador e ele decide quando ele está bom. O editor muda **só o
  nome** — geometria vem da gravação (Sprint 4) e acessibilidade é da Sprint 9 — e
  por isso mostra distância, contagem de pontos e data como contexto, que é o que
  quem chegou por toque no trajeto não tem na frente.
- **Excluir caminho continua por linha**, com o `Dialog` destrutivo da Sprint 5.
  O botão de apagar é `trailingAction` do `ListRow`, não `trailing`: `trailing` fica
  **dentro** da área tocável da linha, e um botão dentro do botão da linha
  desaparece para o leitor de tela, que trata o conteúdo da linha como rótulo do
  botão externo. É a única diferença entre os dois props e ela é sobre toque, não
  sobre posição.
- **Apagar caminho é por linha, com `Dialog` destrutivo**, repetindo distância e data
  para ninguém apagar o trajeto errado, e com o botão ocupado enquanto o pedido está
  em voo. É a regra do `DeleteAction` aplicada a uma lista: ação irreversível no
  corpo da tela, nunca no menu do cabeçalho. O `DeleteAction` continua sendo das
  telas de detalhes (evento e navegação), que têm um registro só.

### Provider

O app usa **Apple Maps no iOS e Google Maps no Android** — os dois são o padrão do
`react-native-maps`, sem `PROVIDER_GOOGLE` no `MapView`.

**O Google Maps no Android exige `com.google.android.geo.API_KEY`, e sem a chave o app morre.**
Não é mapa em branco nem aviso: `MapsInitializer.initialize` lança
`java.lang.RuntimeException: API key not found` na criação do `MapView`, a exceção sobe até o
`main` e o processo morre. Confirmado em logcat no emulador, na abertura de
`/user/map/[mapId]`:

```
E/AndroidRuntime: FATAL EXCEPTION: main
java.lang.RuntimeException: API key not found.  Check that <meta-data android:name="com.google.android.geo.API_KEY" .../>
	at com.google.android.gms.maps.MapsInitializer.initialize(...)
	at com.rnmaps.fabric.MapViewManager.setGoogleRenderer(MapViewManager.java:268)
```

O iOS não passa por isso porque o Apple Maps não pede chave. Por isso o mapa funcionava no
simulador iOS e quebrava só no Android — o mesmo `EventMap`, a mesma tela.

- A chave vem de `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` no `.env` (ver `.env.example` para o
  passo a passo no Google Cloud e para a restrição por pacote e SHA-1).
- **`app.json` não dá conta de ler o `.env`**, então `app.config.ts` existe: ele recebe o `app.json`
  resolvido e troca `["react-native-maps", {}]` por `["react-native-maps", { androidGoogleMapsApiKey }]`.
  Sem essa chave no plugin, o `AndroidManifest.xml` gerado no `prebuild` não recebe o `meta-data` e
  o app crasha no primeiro mapa. Trocar a chave exige `prebuild` + build novo — não dá para
  atualizar por OTA.
- **`PLACEHOLDER` é o valor enquanto não houver chave de verdade**, e ele nunca é injetado no
  manifesto. Um placeholder que chegasse ao manifest faria o Google Maps aceitar a chave, montar o
  mapa e desenhá-lo em branco, sem nenhuma pista do que falta — sem chave nenhuma o app nem chega a
  montar, o que pelo menos deixa o log dizer o que falta.
- **Por isso `EventMap` tem guarda em tempo de execução**: `isMapProviderAvailable` é
  `Platform.OS !== 'android' || hasGoogleMapsAndroidKey`. Sem chave no Android, `EventMap` devolve
  `UnavailableMap` — um `EmptyState` "Mapa indisponível no Android" no mesmo contêngulo e com o
  mesmo `testID` do mapa, então a tela não muda de tamanho e o app continua vivo. A guarda é uma
  **fronteira de componente** (`EventMap` escolhe entre `UnavailableMap` e `DrawnMap`), não um
  retorno no meio do corpo: `rules-of-hooks` acusa o retorno antecipado, e com razão. O valor é
  constante na vida do processo, mas a estrutura não depende disso.
- A guarda vale para as duas telas que desenham mapa — `/user/map/[mapId]` e
  `/organizer/event/[eventId]/map/[mapId]` — porque vive no `EventMap`, não na tela.

### `android.usesCleartextTraffic` no `app.json` não faz nada — use o config plugin

Em desenvolvimento `EXPO_PUBLIC_API_URL` aponta para `http://10.0.2.2:3333` (ou o IP LAN do host),
e o Android bloqueia HTTP a partir da API 28. Sem liberar tráfego em claro o app nem chega a
montar o `EventMap`: a tela mostra "Não foi possível carregar" / "Não foi possível conectar ao
servidor" e o crash da chave some junto, o que faz o problema parecer outro.

A armadilha: `android.usesCleartextTraffic` no `app.json` **sobrevive ao `expo config`** (aparece
como `true` no JSON resolvido) mas o SDK 57 **não o aplica ao manifesto**. Só os manifestos de
`debug` e `debugOptimized` recebem a flag; o de `release` não. Um build de release nasce sem
cleartext, e como o `android/` é gitignored ninguém percebe o drift.

Por isso a flag vem do plugin, e o `app.json` continua com a chave morta apenas como documentação
do problema original (commit `c47e0c5`, que já previa o ajuste):

```json
["expo-build-properties", { "android": { "usesCleartextTraffic": true } }]
```

Depois de mexer nisso, `prebuild` sem `--clean` e confira o manifesto **de release**:

```bash
grep -o 'android:usesCleartextTraffic="[a-z]*"' android/app/src/main/AndroidManifest.xml
```

O mesmo plugin tem `android.buildArchs`, que sobrescreve `reactNativeArchitectures` no
`gradle.properties` de forma que sobrevive ao `prebuild`. Para iteração local use
`-PreactNativeArchitectures=arm64-v8a` na linha de comando; se virar permanente no `app.json`,
os APKs de release passam a ser arm64-only e isso precisa ser uma decisão consciente.

## Data layer

`src/data/repository.ts` define `AppRepository` (async: `listEvents(category?)`,
`listEventCategories`, `createEvent`, `getEvent`,
`updateEvent`, `deleteEvent`, `listNavigationMaps`, `createNavigationMap`, `getNavigationMap`,
`renameNavigationMap`, `deleteNavigationMap`, `listPaths`, `createPath`, `getPath`,
`updatePath`, `deletePath`).
O singleton exportado por `src/data/index.ts` escolhe a implementação por
`EXPO_PUBLIC_DATA_SOURCE`:

- `api` (padrão) → `createHttpRepository()`, que fala com o NestJS em `EXPO_PUBLIC_API_URL`.
- `memory` → `createInMemoryRepository()`, o protótipo da Sprint 1: os dados vivem no escopo do
  módulo, sobrevivem à navegação mas são perdidos ao fechar o app.

As telas importam só `repository`, então trocar de fonte (ou adicionar persistência local do RNF05
atrás de `src/data/`) não toca em nenhuma tela. Erros da API chegam como `ApiError`, que extrai a
mensagem pt-BR do corpo NestJS — as telas exibem esse texto em vez de uma mensagem genérica.

**O repositório em memória é uma segunda implementação do mesmo contrato, não um
atalho.** Onde a API tem regra, a implementação em memória tem a mesma: a distância
do caminho sai de `geometryLengthInMeters` com o mesmo arredondamento do backend,
um trajeto de comprimento zero é recusado com a mesma frase, e apagar um evento ou
uma navegação leva os caminhos junto, como o `ON DELETE CASCADE` do Postgres. Sem
isso o time desenvolve contra um comportamento que a API não tem — e o defeito só
aparece em produção.

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
- `vitest` (dev) — teste do TypeScript puro de `src/utils/` e `src/types/`.
  O `backend` já usa vitest, então é o mesmo runner e o mesmo `*.spec.ts` nos dois apps; o Expo
  não traz runner de teste, e `jest-expo` puxaria ambiente de render que o MVP não precisa — o
  que tem regra de negócio puro mora em `utils/` justamente para poder ser testado assim.
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
- `react-native-maps` — o mapa do app, o `EventMap` de `src/components/map/`. Já estava instalado
  desde a Sprint 0, e é o que o PRD §24 fixa, então não é uma escolha nova: o `expo-maps`, também
  oficial do Expo, fica de fora porque a fonte de verdade das tecnologias é o PRD. Traz config
  plugin, declarado em `app.json`; a chave do Google Maps do Android entra pelo `app.config.ts`, que
  a lê do `.env` — sem ela o Android crasha ao abrir qualquer mapa. Ver a seção **Mapa**.
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
