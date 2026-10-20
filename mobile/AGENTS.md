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
│   ├── map/        # EventMap: mapa, marcadores, trajetos, retângulos de POI e a camada de arraste do trajeto
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

Estas quatro foram decisões de equipe, então ficam registradas aqui para que a fonte de verdade não
divirja da implementação:

- **Ícones seguem Lucide React Native, com `@expo/vector-icons` como reserva.** A regra do
  repositório é preferir a solução oficial do Expo, e `@expo/vector-icons` é o pacote oficial —
  mas o catálogo de `src/components/ui/icon.tsx` foi construído em cima de `lucide-react-native`
  e é ele que o app usa de fato. Inverter isso agora custaria reescrever 140 entradas já
  portadas, sem ganho visível. `@expo/vector-icons` fica **instalado como reserva**: quando o
  Lucide não tiver o ícone desejado, procure nele também antes de inventar um nome. Todo ícone
  continua entrando por `ui/icon.tsx`, que é `Record<IconName, …>` — é essa fechadura de tipos
  que impede um nome usado e ausente de renderizar `null` em silêncio. Todos os tamanhos foram
  normalizados nos três valores do design: 20, 24 e 32. Os símbolos de Entrada/Saída,
  Escada e Elevador usam o catálogo Material Community Icons via `@expo/vector-icons`, pois seus
  pictogramas são mais específicos que os equivalentes Lucide disponíveis.
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

- O cabeçalho nativo usa voltar à esquerda (`arrow-left`). O lado direito fica vazio por padrão e
  mostra apenas ações contextuais declaradas pela tela, agrupadas por `HeaderActions` em
  `src/components/header-actions.tsx`.
- Telas raiz (`/organizer`, `/user`) sobrescrevem `headerLeft` com `() => null`: não há tela anterior
  porque a entrada na seção usa `router.replace`.
- Telas internas não repetem o título que o cabeçalho já mostra; mostram apenas o texto de apoio.
- `Stack.Screen` define `headerRight` apenas nas telas que têm ação própria. Cada uma monta
  `HeaderActions` de `src/components/header-actions.tsx` com a ação como `children`.
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
/organizer/event/[eventId]/map/[mapId]  Consulta da navegação: desenho + listas + botão "Editar a navegação"
/organizer/event/[eventId]/map/[mapId]/edit  Editar navegação (card de rename + portas: ponto/área, caminho, ajuste)
/organizer/event/[eventId]/map/[mapId]/adjust  Ajustar caminhos diretamente no mapa
/organizer/event/[eventId]/map/[mapId]/record    Gravar um caminho novo (Sprint 4)
/organizer/event/[eventId]/map/[mapId]/path/[pathId]  Editar caminho (nome + porta para o ajuste; Sprint 6)
/organizer/event/[eventId]/map/[mapId]/path/[pathId]/adjust  Ajustar trajeto no mapa (vértices e trechos)
/organizer/event/[eventId]/map/[mapId]/poi/[poiId]  Editar ponto de interesse (Sprint 7)
/organizer/event/[eventId]/map/[mapId]/areas  Desenhar/editar áreas e adicionar pontos de interesse (Sprint 8)
/organizer/event/[eventId]/map/[mapId]/details  Detalhes da navegação (criada/atualizada em)
/user                    Eventos para consulta
/user/categories           Categorias com eventos cadastrados e a contagem de cada uma
/user/categories/[category]  Eventos da categoria
/user/event/[eventId]      Navegações do evento
/user/event/[eventId]/details  Detalhes do evento (mesmos dados, sem edição)
/user/map/[mapId]          Mapa da navegação (o EventMap com caminhos e pontos salvos)
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
- `regionForGeometry` enquadra tudo com 0,0002° de folga e piso geométrico de 0,0002°
  (≈22 m). O zoom inicial visual é o máximo menos dois passos (`0,000512°`, ≈57 m),
  compartilhado pelo editor e pela câmera de gravação; ao enquadrar conteúdo, esse é o
  mínimo e a câmera abre mais afastada somente se precisar mostrar a geometria inteira.
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

`map/[mapId]` é o hub de **consulta**: mostra o mapa com os caminhos já gravados e
a lista do que existe, e é de onde se sai para editar — o botão
**"Editar a navegação"** empurra para `/edit`, que tem o rename e as três portas
(ponto, caminho novo, ajuste de trajeto). A gravação ficou na rota ao lado, então
a lista não é empurrada para baixo por um painel de GPS.

- **Navegação e caminhos são dois `useAsyncData`**, e não um só com `Promise.all`: a
  lista falhar não pode trocar o mapa da tela por um erro, e o mapa é o conteúdo
  principal do hub. O `useRefreshOnFocus` recarrega os dois, porque quem salva é a
  tela de gravação e a tela não é remontada ao voltar.
- **O `EventMap` só monta depois que caminhos e pontos terminam de carregar.** O
  `initialRegion` só vale na montagem; iniciar o mapa com as listas ainda vazias
  abriria no centro genérico (São Paulo), não no local das coordenadas salvas. Até
  as duas consultas resolverem, o espaço do mapa mostra o estado de carregamento.
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
  quem chegou por toque no trajeto não tem na frente. O botão "Ajustar trajeto no
  mapa" empurra para `/path/[pathId]/adjust`, que é onde a geometria se mexe; aqui
  ela é contexto, não alvo.
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

### Fundo do OpenStreetMap no `EventMap` (decisão de equipe)

O `EventMap` desenha uma camada de tiles do OpenStreetMap por cima da base nativa, com
`<UrlTile>` (`MapUrlTile`) — o `react-native-maps` 1.27.2 já traz o componente. A decisão veio
de a equipe preferir o visual do OSM (que o `MapCanvas` do editor já usava), e ela mantém **um
mapa só** no app em vez de dividir por papel (organizador num mapa, participante em outro):

- **Por que não migrar tudo para o `MapCanvas`.** O `EventMap` entrega de graça localização
  (`showUserLocation`), câmera que segue a gravação (`cameraToFollow`), toque no mapa e a
  interação nativa; o `MapCanvas` é um editor SVG e teria que portar tudo isso. Também
  contrariaria o PRD §24, que fixa `react-native-maps`.
- **Por que não a divisão por papel.** Dois componentes de mapa para manter, comportamento
  diferente para a mesma coordenada, e os tiles do OSM cairiam justamente na tela de maior
  tráfego (o participante).
- **Fonte única dos tiles.** `OSM_TILE_SERVER`, `OSM_TILE_URL_TEMPLATE` e `OSM_TILE_MAX_ZOOM`
  vivem em `utils/tiles.ts` e são o que o `<UrlTile>` do `EventMap` e o `MapCanvas` do editor
  compartilham — o editor monta a URL por tile, o mapa nativo recebe o `{z}/{x}/{y}`. O
  `EventMap` passa o limite como `maximumNativeZ` (nunca como `maximumZ`, que esconderia o overlay
  acima do limite): ao aproximar além do zoom 19, o tile OSM de maior resolução é ampliado e
  continua cobrindo o mapa. Trocar de provedor é trocar esse prefixo em um lugar.
- **Política do OSM.** O servidor público `tile.openstreetmap.org` **não é para escala**:
  atende o editor e a visualização no desenvolvimento, mas produção exige um provedor próprio
  (MapTiler, Stadia, self-host) ou o `UrlTile` passa a violar a política de uso. A atribuição
  `© colaboradores do OpenStreetMap` é obrigatória e aparece como `Pressable` (link para
  `openstreetmap.org/copyright`) no canto do `EventMap`, igual ao `MapCanvas`. O
  `tileCacheMaxAge` acompanha os sete dias que a política pede quando o cliente não lê os
  headers.
- **Plataformas.** Os tiles são opacos, então cobrem a base Apple/Google nas duas; no iOS o
  `shouldReplaceMapContent` também desliga o desenho da base por baixo (o Android ignora a prop,
  mas a cobertura opaca resolve). A chave do Google Maps no Android continua obrigatória — o
  `UrlTile` **não** substitui o provedor nativo, só cobre a base. O comportamento da sobreposição
  difere entre Apple Maps e Google Maps, então **o veredito é em aparelho**.
- **Zoom e detalhe iguais ao editor de áreas.** Todos os mapas do `EventMap` mostram os
  botões +/− (os mesmos `IconButton` e `ZOOM_FACTOR` do `MapActions` do editor, com os mesmos
  limites de 22 m a 5,5 km) no mesmo canto do editor, para a visualização nascer igual à tela de
  cadastro de ponto de interesse. As telas de visualização passam `fitPadding` menor para o
  território caber com o mesmo detalhe do `MapCanvas`. O zoom inicial é o máximo menos dois
  passos (`INITIAL_LATITUDE_DELTA = MIN_LATITUDE_DELTA × ZOOM_FACTOR²`); mapas com conteúdo
  mantêm todo o desenho visível e só abrem mais afastados quando ele exige. Sem conteúdo, o
  `EventMap` usa o mesmo `INITIAL_CENTER`/zoom padrão do editor. As telas de edição mantêm o
  respiro padrão (`DEFAULT_FIT_PADDING`) para as alças não nascerem fora do mapa — mas os botões
  +/− continuam, pois o pedido é um visual só. A única exceção em que os botões somem
  é enquanto a câmera **segue o GPS** na gravação: lá o zoom manual não tem efeito, pois o laço
  de acompanhamento reenquadraria o mapa no instante seguinte.

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

## Ajuste manual do trajeto (decisão de equipe)

O GPS entrega o trajeto torto vez ou outra (PRD §10.2), e consertar coordenada é
trabalho de mapa — por isso o ajuste é uma tela própria de mapa, não um campo do
editor de nome, e o hub de navegação virou **consulta**: desenho + listas + botão
**"Editar a navegação"**, que empurra para `/edit` (rename + três portas). De lá,
**"Ajustar rota"** abre `/adjust` com todos os caminhos no mapa; tocar em qualquer
trajeto o seleciona para edição, sem sair do mapa. O organizador pode ajustar e
salvar vários caminhos nessa mesma tela. O editor de nome também tem um botão para
`/path/[pathId]/adjust`, já com o caminho escolhido.

**Fluxo de gravação — rascunho local, gravação explícita.**

- A tela monta **um** `useAsyncData` com `getPath` + `listPaths(mapId)` +
  `listPois(mapId)`: mapa, painel e polilinhas de contexto nascem juntos, sem
  refit do mapa quando o contexto chega atrasado (contexto não zera a câmera; o
  bump de `cameraTick` do `EventMap` cobre `editable || editablePath`).
- O estado é `savedGeometry` (números que vieram da API) e `draft` (o que está na
  tela). Cada gesto compõe `pending.current` de forma síncrona entre `move`s;
  `draft` acompanha o preview e o commit marca a alteração no fim.
- **"Salvar ajuste"** chama `replacePathGeometry`; a resposta da API vira
  `savedGeometry`/`draft` (números do banco), a tela **fica** e mostra `Alert
tone="success"`. **"Descartar alterações"** só aparece com alterações pendentes
  e volta ao `savedGeometry`. Sem `useRefreshOnFocus` aqui: recarregar no foco
  jogaria o rascunho fora.
- Na tela `/adjust`, a faixa de seleção é uma linha compacta acima do mapa. O
  botão fixo **"Salvar ajustes"** fica no rodapé mesmo sem seleção, desabilitado
  quando não há rascunhos alterados. Ao ativá-lo, salva todos os caminhos
  modificados; se parte falhar, mantém os rascunhos restantes para nova tentativa.
- Ao tocar numa rota ou em seu card, o `EventMap` centraliza todos os extremos da
  geometria com padding em pixels reduzido e aproxima até o máximo permitido pelo
  piso de zoom. Se o zoom atual já estiver mais próximo, preserva-o. Rascunhos de
  rotas não selecionadas continuam desenhados no mapa ao trocar de seleção.
- Um toque no fundo do mapa procura a rota mais próxima até 3 m: isso mantém a
  seleção de rota confiável mesmo quando o provedor não dispara `Polyline.onPress`.
  Sem rota nesse raio, o toque desmarca a seleção.

**A camada de arraste (`components/map/path-edit-overlay.tsx`).**

- Espelha o padrão do `poi-rect-handles.tsx`: `HANDLE_SIZE 44` (desenho 16),
  `DRAG_THRESHOLD 24`, alvo acessível `accessibilityRole="adjustable"` com
  increment = afastar/esquerda e decrement = aproximar/direita,
  `onPanResponderTerminationRequest: () => false`. Um arraste por vez
  (`dragActive`).
- **Só vértices existentes são editáveis.** `selectHandleIndices` identifica as
  pontas e mudanças relevantes de direção sem reduzir a geometria enviada à API:
  uma reta tem duas alças, um V três e um W cinco. Arrastar uma alça redistribui
  as amostras do trecho adjacente, preservando a quantidade original de pontos e
  mantendo as alças disponíveis quando a rota fica reta. A linha e o fundo ficam
  livres para pan e pinça; nenhum gesto insere ou remove vértices.
- **As alças acompanham o pan.** `onRegionChange` reprojeta as alças visíveis
  durante o movimento, agrupando o trabalho por frame; `onRegionChangeComplete`
  reprojeta a seleção existente, inclusive depois de zoom ou redimensionamento do
  mapa. Durante o arraste de uma alça, a projeção fica congelada para o alvo não
  sair debaixo do dedo, e o próprio ponto acompanha o gesto via `projectCoordinate`.
- Quem usa leitor de tela usa `nudgeVertex` (`utils/pathGeometry.ts`, passo de
  2 m), e o SR chama `onPreview` + `onCommit` juntos (`commitNudge`).
- `describeContent` usa `${id}:editing` para a polilinha editável, para não
  disparar o refit do `EventMap` sob o dedo. `pointForCoordinate(c): Promise<Point>`
  rejeita também **antes do `onMapReady`** (e depois do unmount): o Fabric não
  encontra a view no registro ("Invalid view returned from registry…"), então os
  o efeito de projeção completa tem gate de `isReady` e engole a rejeição
  (`.catch(() => undefined)`) — o próximo `cameraTick`/`isReady` tenta de novo.
  Sem `try/catch` no corpo.
- **O array de respondentes do overlay é posicional** (`handles.map`), enquanto
  `handle.index` é o índice (esparso) na geometria original. Buscar o responder
  pelo índice geométrico em vez da posição no array pode deixar alça sem gesto
  (ou mover o vértice errado).
- `react-hooks/refs`: o `latest.current` só é atualizado dentro de `useEffect`
  (nunca durante render, que a regra aceita); os `eslint-disable-next-line
react-hooks/refs` dos `map`s ficam ancorados na linha do erro, com a justificativa
  acima — mover o comentário muda a âncora e o lint volta.

**Regras de domínio que o ajuste não pode quebrar.**

- Geometria é `readonly Coordinate[]` puro (`MapGeometry`), sem migração: zero
  alterações de banco; `PATCH /paths/:pathId/geometry` valida só comprimento zero
  ("O trajeto ajustado tem comprimento zero. Desfaça os ajustes.").
- **Ajustar o trajeto não muda acessibilidade.** Os atributos (`hasStairs`,
  `accessibilityStatus`…) continuam os que o organizador reportou (Sprint 9) e a
  copy nunca diz que a rota ficou "segura"/"ideal" — PRD §19/§30.
- Distância exibida vem de `geometryLengthInMeters` + `formatDistance` sobre o
  rascunho; a do banco é recalculada pela API.

## Pontos de interesse (Sprint 7)

`PointOfInterest` é o nó do grafo do mapa (PRD §8.1): `Path` vai referenciar estes
pontos como `startNodeId`/`endNodeId` na Sprint 9, e os atributos de acessibilidade
do ponto ficam para a Sprint 10. O que a Sprint 7 entrega é o cadastro.

- **O que se grava é `rect` + `anchor`, nunca `position`.** A marcação é uma
  **área** — "é aqui" — e o que o organizador aponta não é uma coordenada, é um
  trecho de parede, de porta, de balcão. `rect` são dois cantos opostos e `anchor`
  é a fração `u`/`v` onde o ícone está dentro da caixa; a `position` é **derivada
  pela API** e existe na resposta, não no banco (`AddPoiRect1730000006000`, com
  backfill de `anchor` central para o que já estava gravado). Guardar os três
  deixaria o banco aceitar uma `position` que não corresponde à caixa desenhada —
  e o banco não tem como recusar isso. `src/utils/poiAnchor.ts` (app) e
  `backend/src/pois/poi-anchor.ts` (API) são o mesmo cálculo em duas pontas, e
  ambos têm teste.
- **A posição se escolhe no mapa — arrastando o ícone ou tocando nele — e nunca
  digitando latitude e longitude.** Quem monta o mapa conhece o lugar: andou por ele
  gravando os caminhos. Digitar `lat`/`lng` colocava o ponto em `0,0` quando o campo
  ficava vazio, e `parseFloat(...) || 0` transformava coordenada digitada errada em
  `0,0` em silêncio — o ponto nascia no Golfo da Guiné e a API aceitava, porque `0,0`
  é uma coordenada válida. Sem marcação escolhida o botão de salvar não habilita,
  então o mapa decide.
- **Arrastar e tocar são a mesma escolha por três portas, e as três ficam.**
  Arrastar o ícone da paleta até o lugar é o caminho mais direto, mas não é
  acessível: leitor de tela não arrasta, e arraste é o gesto mais difícil para quem
  tem tremor. Então tocar no ícone **seleciona o tipo** e tocar no mapa **coloca o
  ponto desse tipo**; e, com o ponto já colocado, tocar nele e depois no destino
  **move** o ponto. As três portas escrevem no mesmo estado. Arraste é atalho,
  nunca o mecanismo único (RNF04).
- **A caixa e o ícone andam juntos, porque um ícone fora da caixa é um estado que a
  interface não consegue explicar.** Arrastar o ícone translada o retângulo inteiro
  (`dragIconTo`); redimensionar a caixa pelo canto move o ícone **dentro** dela,
  mantendo a âncora. São gestos opostos na mesma informação, e é a âncora que faz
  os dois concordarem: ela é a fração que sobrevive ao redimensionamento.
- **O retângulo é geográfico e as alças são em pixel.** A caixa é um `Polygon` com
  as quatro pontas de `rectCorners`, e as alças de canto são uma camada de toque
  por cima, posicionada com `pointForCoordinate` — a única projeção de
  coordenada para pixel que a biblioteca expõe (`coordinateFromPoint` não existe na
  1.27.2). Nada disso é gravado: a caixa é a mesma coordenada antes e depois do
  zoom, e quem reposiciona as alças é o `cameraTick` do `onCameraSettled`.
- **`resizeRect` faz a conta em bordas, não em cantos.** Num `PoiRect` só dois
  cantos são guardados e o leste mora em `northEast[1]` enquanto o oeste mora em
  `southWest[1]` — a mesma aresta nos dois. Escrever o canto arrastado no lugar
  deixaria a aresta inconsistente e o polígono sairia virado. Por isso a função
  extrai as quatro bordas, aplica no par que o canto toca e remonta os dois cantos
  por `normalizeRect`, que é o que garante a ordem canônica por construção.
- **A alça de canto tem versão sem arraste.** `accessibilityRole="adjustable"` sem
  `onAccessibilityAction` é um botão morto no leitor de tela: as duas ações são
  anunciadas e nenhuma faz nada. `increment`/`decrement` chamam
  `resizeRectByStep`, que escolhe a coordenada e delega para `resizeRect` — o
  caminho de leitor de tela grava exatamente o que o dedo grava. O passo é
  `DEFAULT_POI_RECT_SPAN` (≈4,4 m) e não `MIN_POI_RECT_SPAN` (≈2 m) porque um
  passo de 2 m é fisicamente exato e visualmente invisível.
- **O `PanResponder` só toma o gesto no `move`, depois de 24px
  (`DRAG_THRESHOLD`).** Com `onStartShouldSetPanResponder: () => true` o item se
  tornaria responsável pelo gesto antes do `Pressable` resolver o toque, e o
  `onPress` de selecionar o tipo nunca chegaria. E
  `onPanResponderTerminationRequest: () => false` é o que impede o `ScrollView` da
  tela de roubar o gesto no meio da queda — a paleta está dentro dele.
- **Um `PanResponder` por tipo.** Com um só para a paleta inteira, o `dx`/`dy` seria
  relativo ao canto da paleta e o ponto nasceria deslocado do dedo. E o ícone em
  trânsito é um desenho à parte dentro do próprio item (`pointerEvents="none"`),
  enquanto o `Pressable` fica onde está: traduzir o gesto em deslocamento relativo
  ao item evita converter coordenada de tela para coordenada de conteúdo do
  `ScrollView`.
- **Por que `PanResponder` e não `react-native-gesture-handler`.** O gesto é um
  arraste de dois eixos, sem pinça nem múltiplos toques; o gesture-handler aparece
  aqui só como transitivo do `expo-router`, e usá-lo diretamente pediria um módulo
  nativo novo, `GestureHandlerRootView` na raiz e plugin de Babel, para um gesto que
  o `PanResponder` resolve. A animação do ícone que segue o dedo é do Reanimated,
  que já é dependência pelo NativeWind.
- **`SharedValue.set()` e não `.value =`** ao escrever valor de gesto. Reanimated
  expõe os dois e o compilador do React não distingue a semântica: `sv.value = x`
  dentro de um `useMemo` é lido como mutação durante o render. `set()` é a mesma
  escrita (`SharedValue.set()` chama o mesmo `valueSetter`) e é uma chamada de
  método.
- **O valor do gesto mora em `SharedValue`, não em `useRef`.** O React Native relê os
  `panHandlers` das props **a cada evento** do gesto, não uma vez no começo: se o
  `useMemo` recriasse o responder no meio do arraste — e recria, porque `height`
  muda a cada quadro — o novo responder somaria `dy` sobre a altura que já tinha
  crescido, e o mapa andaria mais rápido que o dedo.
- **A conversão de tela para coordenada é de `utils/dropCoordinate.ts`, e é pura
  para ter teste.** O `react-native-maps` 1.27.2 só expõe `pointForCoordinate`
  (coordenada → pixel); o inverso, `coordinateFromPoint`, não existe nos tipos nem
  no código nativo dessa versão (verificado em `dist/src/MapView.d.ts`, `ios/` e
  `android/`). Sem ele, a conta é a projeção do próprio `Region`: dividir o
  retângulo em frações e aplicar cada fração ao seu `delta`. Devolve `null` quando
  não dá para converter — antes de medir, com tamanho zero ou com região
  degenerada — e o chamador trata como "ainda não dá para soltar".
- **`EventMapHandle.resolveDrop` é assíncrono e mede na hora da queda.** Medir a
  origem no `onLayout` pareceria suficiente, mas `onLayout` não dispara quando a
  **tela** rola: o mapa se desloca na janela sem que o layout interno dele mude, e
  todo ponto nasceria deslocado pela altura da rolagem — sem erro, a conta fechando
  com números certos para o lugar errado. `measureInWindow` na queda custa uma
  medição por arrasto.
- **O mapa não é redimensionável, e a altura do mapa não é mais uma constante de
  `utils/`.** Era redimensionável porque escolher o ponto parececia pedir um desenho
  maior — entrada e banheiro podem estar a poucos metros um do outro. Deixou de
  ser verdade quando o ponto virou **marcação**: quem escolhe o tamanho da marcação
  agora arrasta a alça de canto, e o enquadramento é o zoom do próprio mapa. A
  janela do mapa só mudava o zoom inicial, com dois controles para a mesma coisa,
  então `MapResizeControls`, `resizable-map.tsx`, as constantes `MAP_*_HEIGHT` e o
  prop `height` do `EventMap` saíram — `dropCoordinate.ts` ficou só com a conversão
  de ponto para coordenada, e o mapa do formulário é `h-72` fixo, como as outras
  telas.
- **O enquadramento automático usa os quatro cantos do retângulo, não só o ícone.**
  Quem abre um mapa só com um ponto salvo precisa que a caixa inteira caiba na
  tela: uma marcação de 8 m que nasce cortada na borda é o desenho do organizador
  aparecendo pela metade. `describeContent` por outro lado usa o **par** de cantos,
  porque o número de cantos é sempre quatro e contar não registraria o arraste da
  alça — que é o que redesenharia o mapa a cada quadro.
- **O nome do ponto é opcional, e o tipo é o fallback.** Quem não nomeou continua
  reconhecendo o ponto pelo ícone e pelo tipo. `CreatePoiDto.name` é opcional e o
  `PoisService` grava `dto.name?.trim() || dto.type` — a coluna segue `NOT NULL`,
  porque "não tem nome" é ausência de dado e o banco não tem por que carregar essa
  diferença. `describePoi` não repete o tipo quando o nome é o próprio tipo, para o
  leitor de tela não vocalizar "Elevador, Elevador".
- **Descrição e informação de acessibilidade saem da UI desta sprint.** Elas
  continuam no domínio e na API para a Sprint 10, e o formulário daquela hora vai
  preencher o que já está no banco. Três campos de texto antes de o ponto existir
  no mapa fazem o cadastro parecer maior do que é, e o que o organizador sabe
  sobre acessibilidade é dado dele, não verificado pelo app (PRD §19).
- **O ícone de cada tipo é uma decisão só, em `utils/poiIcons.ts`.** A paleta e o
  `MapPin` liam o mesmo catálogo; quando os dois tinham a sua lista, o marcador
  mostrava um desenho e a paleta outro. `IconName` (`src/types/icon.ts`) é a união
  que garante que todo ícone usado existe no catálogo de `ui/icon.tsx` — foi uma
  auditoria desses dois arquivos que achou seis nomes usados e ausentes, que
  renderizavam `null` em silêncio.
- **`tracksViewChanges={false}` voltou a ser `true`** no marcador, que agora tem
  estado (o tipo escolhido no rascunho). Sem isso o Android redesenha o marcador a
  cada quadro.
- **O formulário carrega o que já existe na navegação** (outros pontos e caminhos) e
  passa como `contextMarkers`/`contextPolylines` ao `EventMap`. Entrar numa navegação
  sem ponto nenhum e tocar no mapa é chute; o contexto é o que faz o toque significar
  alguma coisa. O ponto em edição é o marcador em `highlight`, e é o único `onPress`:
  tocar nele não o move, só abre o editor.
- **Os tipos são os treze da Sprint 7, escolhidos em botões e não em texto livre.**
  Texto livre com o tipo "de qualquer jeito" só aparecia como erro 400 da API depois
  de a pessoa preencher o resto do formulário, e o conjunto de tipos é o vocabulário do
  grafo — o valor gravado precisa ser um dos treze. `PoiTypeValues` vive em
  `src/data/types.ts`, espelhando o `PoiTypeValues` do `poi.entity.ts` do backend.
- **O editor de ponto usa `PoiForm`** (`src/components/poi-form.tsx`): a tela é
  fina, carrega o contexto e passa `onSubmit`/`onDelete`. Pontos novos são
  adicionados no editor de áreas do mapa.
- **Apagar ponto é por linha, com `Dialog` destrutivo**, como o caminho. O editor
  também apaga, com o `DeleteAction` — a ação irreversível mora no corpo da tela,
  nunca no menu do cabeçalho.
- **`markersFromPois` filtra coordenada inválida** com o mesmo `isValidCoordinate`
  que `polylinesFromPaths` usa, porque o ponto que não pode ser mostrado também não
  deve entrar no enquadramento da câmera. O `tone` fica no padrão: a cor de um ponto
  só muda quando existe um contexto, e pintar o ponto de "verde" para dizer que ele
  serve seria vender acessibilidade que ninguém verificou (PRD §19).
- **O toque no mapa tem duas portas e elas não se misturam.** Tocar num marcador ou
  num trajeto é tocar naquilo — por isso o `onPress` é do marcador e da polilinha, e
  nunca um callback único no mapa. Tocar no fundo do desenho é o que posiciona ou
  move um ponto, e chega por `onMapPress` do `EventMap`, que devolve a coordenada
  já no formato gravado (`Coordinate`), não o `LatLng` do `react-native-maps`.

### Áreas do mapa (Sprint 8)

O botão "Adicionar ponto de interesse" da tela de edição abre
`/organizer/event/[eventId]/map/[mapId]/areas`, que é o editor persistido da
Sprint 8. O `MapCanvas` e o `poiEditorReducer` permitem adicionar pontos de
interesse, além de desenhar (retângulo/freehand), selecionar, nomear, tipar,
salvar, editar e apagar áreas via
`repository.listAreas`/`createArea`/`updateArea`/`deleteArea`. O modelo e a API de
`Area` vivem em `backend/src/areas/`; o app fala com eles pelo `httpRepository` e
o `inMemoryRepository` espelha as mesmas regras (inclusive o cascade ao apagar
navegação/evento). As decisões técnicas do canvas ficam registradas abaixo:

- **O desenho é SVG (`react-native-svg`), não o `EventMap`.** O editor precisa de
  conversão ponto↔coordenada bidirecional para desenhar retângulo/livre, mover área e
  editar vértice, e a Sprint 7 documentou que `coordinateFromPoint` não existe no
  `react-native-maps` 1.27.2 — só `pointForCoordinate`. O `EventMap` continua o único
  importador de `react-native-maps`; o `MapCanvas` de `src/components/poi-editor/`
  implementa a projeção com `src/utils/mapViewport.ts` (com teste) e desenha com
  `react-native-svg`, que é a opção do Expo para vetores no React Native.
- **As ferramentas ficam integradas ao mapa.** A faixa superior do canvas contém
  controles só de ícone para retângulo, desenho livre, desfazer, câmera e tipos de
  ponto de interesse. Os rótulos continuam em `accessibilityLabel`/`accessibilityHint`.
  Um toque com retângulo cria um quadrado inicial de 64px; arrastar define os dois
  lados, com piso de 20px. Depois de concluir uma forma, o modo de desenho desarma;
  tocar fora do canvas também o desarma. Dois dedos continuam reservados para pan e
  zoom mesmo com uma ferramenta selecionada.
- **A paleta do canvas experimental é só toque (sem arraste).** Selecionar um tipo na
  faixa do mapa e tocar no canvas coloca o ponto. O fluxo real da Sprint 7 usa o
  `PoiForm`, que também permite arrastar um ícone da paleta até o mapa. Neste canvas,
  tocar de novo no mesmo tipo desarma (`arm-poi` é toggle), e item e ferramenta de
  desenho não coexistem. Depois de colocado, o marcador pode ser arrastado diretamente,
  mesmo sem selecioná-lo antes.
- **Editar um vértice move só aquele vértice.** A geometria mantém a mesma ordem,
  quantidade e identidade de pontos; nem o ajuste de caminho nem o editor de áreas
  deforma vizinhos. Redimensionar uma área também não reposiciona automaticamente o
  ponto de interesse associado.
- **O marcador selecionado tem uma alça para redimensionar o ícone.** Arrastar a
  bolinha no anel pontilhado altera `PoiDraft.markerScale`, não a coordenada do ponto
  nem a geometria da área. A escala fica entre `0.75` e `1.75` para manter o ícone
  legível sem cobrir o mapa; o mesmo ajuste tem ações acessíveis de aumentar/diminuir.
- **O `MapCanvas` desenha o contexto da navegação como pano de fundo.** A tela busca
  caminhos e pontos (`listPaths`/`listPois`, dois `useAsyncData` como no hub) e passa
  ao canvas pelo prop `context` — as polilinhas dos caminhos e as marcações (`rect`)
  dos pontos existentes, desenhadas **por cima da imagem do mapa** com o visual do
  próprio hub: o trajeto é contorno branco + núcleo `primary` (o `tone` padrão), e o
  retângulo do ponto é o mesmo preenchimento translúcido do `EventMap`. Só o cinza
  (`gray300`/`gray100`) sumia na fotografia do OSM e o usuário via o mapa "sem a
  trilha" — o que já está mapeado precisa continuar legível sobre qualquer tile. Os
  pinos dos pontos existentes (`PoiMarker` não-selecionado) completam o contexto. É
  o que faz desenhar sobre um local mapeado significar algo: sem isso o canvas
  experimental abriria em branco ("o mapa não aparece"). O contexto também **entra no
  enquadramento**: a câmera cabe na primeira coisa que chega (contexto ou primeiro
  cômodo) via o mesmo `fitToAreas` do botão Centralizar, e depois nunca mais muda de
  cabeça — recarregar o contexto no foco não tira o zoom de quem está desenhando.
- **O fundo do canvas é o mapa de verdade, em tiles do OpenStreetMap.** O editor não
  usa o `EventMap` (a justificativa do SVG está acima), mas um pavilhão tem endereço e
  os caminhos gravados carregam coordenada WGS84 — desenhar sobre o lugar exige ver o
  lugar. `utils/tiles.ts` calcula a grade de Web Mercator que cobre o `MapViewport`
  (o zoom casa a escala horizontal do canvas com a do Mercator, `256·2^z px = 360°`) e
  cada tile é posicionado com a **mesma projeção linear** do desenho, pelas coordenadas
  das próprias bordas: base e rotas alinham no mesmo ponto e tiles vizinhos não têm
  costura. Os tiles são chaveados por `zoom/x/y` e servidos do cache local por sete
  dias; solicitações novas levam o `User-Agent` estável `AccessEventMobile/1.0`.
  Apenas o enquadramento visível é carregado — não há prefetch nem modo offline — e
  a tela mantém a atribuição clicável `© colaboradores do OpenStreetMap`. A política
  do servidor público exige identificação, cache e créditos: se o provedor mudar,
  preservar também as condições e atribuições específicas dele.

O `MapCanvas` é o lugar do desenho: um único `PanResponder` no contêiner (os filhos
SVG são `pointerEvents="none"`), gesto e commit em duas fases — o desenho do meio do
gesto vive no `preview` local e o `release` confirma **um** passo do histórico do
reducer —, pinça com os dois toques de `touches`, e o enquadramento (zoom in/out,
Centralizar) exposto por `MapCanvasHandle`, o mesmo contrato do `EventMapHandle`.
Os botões de ferramenta, a paleta de pontos e a câmera são controles de ícone
posicionados como sobreposição no topo do mapa, não como etapas do formulário.

**Desenhar e navegar não disputam o mesmo gesto.** Com retângulo ou lápis ativo,
um dedo desenha; dois dedos continuam navegando e ampliando o canvas, cancelando o
rascunho corrente. Ao completar um desenho a ferramenta volta ao modo neutro; um
toque fora do retângulo do mapa também desarma a ferramenta (e a seleção da paleta).
O `PanResponder` do mapa continua dono do gesto e recusa cedê-lo durante a interação.

**As telas com mapa suspendem o gesto de voltar enquanto o mapa está sendo tocado.** O hook
`useMapGestureNavigation` alterna `gestureEnabled` em `onTouchStart`/`onTouchEnd` no contêiner do
mapa. Nas telas interativas, mantenha `fullScreenGestureEnabled: false`: no iOS 26 o
`interactiveContentPopGestureRecognizer` cobre a tela toda e pode começar o pop antes que a tela
consiga reagir ao primeiro movimento. Com o reconhecedor de tela inteira desligado, o gesto padrão
de borda continua disponível fora do mapa; durante o toque no mapa, `gestureEnabled` também fica
desligado. Anexe os handlers ao contêiner que realmente envolve o mapa e mantenha as rotas
contêiner `organizer`/`user` com o gesto raiz desativado para não sair de toda a seção. A tela de
mapa de exemplo, que não tem interação de pan, pode manter o gesto de tela inteira habilitado.

## Data layer

`src/data/repository.ts` define `AppRepository` (async: `listEvents(category?)`,
`listEventCategories`, `createEvent`, `getEvent`,
`updateEvent`, `deleteEvent`, `listNavigationMaps`, `createNavigationMap`, `getNavigationMap`,
`renameNavigationMap`, `deleteNavigationMap`, `listPaths`, `createPath`, `getPath`,
`updatePath`, `deletePath`, `replacePathGeometry`, `listPois`, `createPoi`, `getPoi`,
`updatePoi`, `deletePoi`, `listAreas`, `createArea`, `updateArea`, `deleteArea`).
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
- `expo-file-system` — módulo oficial do Expo usado por `services/mapTileCache.ts` para baixar tiles
  visíveis com identificação própria e mantê-los no cache local conforme a política de uso do OSM.
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
