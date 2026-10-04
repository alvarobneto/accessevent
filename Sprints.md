# Plano de Sprints — Implementação do MVP

## 1. Visão geral

O desenvolvimento será dividido em **6 fases**, compostas por pequenas sprints incrementais.

A lógica é começar pela infraestrutura e pelo núcleo do mapa, avançar para o cadastro de acessibilidade e, finalmente, construir a experiência do participante e o sistema de rotas.

```text
FASE 1
Fundação
    ↓
FASE 2
Mapeamento
    ↓
FASE 3
Construção do mapa
    ↓
FASE 4
Acessibilidade
    ↓
FASE 5
Navegação do participante
    ↓
FASE 6
Integração e entrega
```

---

# Fase 1 — Fundação do projeto

**Objetivo:** criar a base técnica e estrutural do aplicativo.

### Sprint 0 — Setup

* [x] Criar projeto Expo (React Native + TypeScript).
* [x] Configurar TypeScript.
* [x] Configurar ESLint e Prettier.
* [x] Configurar navegação (Expo Router).
* [x] Configurar `expo-location`.
* [x] Criar backend.
* [x] Configurar PostgreSQL.
* [x] Configurar Docker.
* [x] Criar repositório.
* [x] Configurar variáveis de ambiente.
* [x] Criar endpoint `/health`.

### Sprint 1 — Navegação básica

A tela inicial escolhe o modo de uso e leva para uma das duas áreas, sem login e
sem servidor. Os dados ficam apenas em memória, atrás de uma interface de
repositório que depois será trocada por persistência local ou pela API.

```text
Início ("Eu sou organizador" / "Eu sou usuário")

Organizador
├── Eventos (criar evento e abrir "Gerenciar evento")
├── Criar evento
├── Gerenciar evento
│   ├── Criar navegação
│   └── Visualizar navegações (abrir o editor)
└── Editar navegação (título)

Usuário
├── Eventos
├── Navegações do evento
└── Mapa
```

* [x] Criar navegação.
* [x] Criar telas principais.
* [x] Criar componentes básicos.
* [x] Criar estados de loading/error.
* [x] Isolar os dados em `src/data/` (`AppRepository` + implementação em memória).
* [x] Remover autenticação, mocks e persistência do protótipo.

### Sprint 2 — Eventos

* [x] Criar evento.
* [x] Listar eventos.
* [x] Visualizar evento.
* [x] Editar evento.
* [x] Criar modelo `Event`.
* [x] Criar endpoints de eventos.

**Entregue além da lista, e verificado:**

- [x] Persistência real em PostgreSQL: `synchronize: false`, migração versionada e serviço
      Docker `migrate` (`node dist/database/migrate.js run`) que roda antes da API.
- [x] Migração e entidades conferidas contra o schema builder, sem divergência.
- [x] `Map` para não quebrar a interface de navegações já existente: `GET`/`POST
      /events/:eventId/maps` e `GET`/`PATCH /maps/:mapId`.
- [x] Mobile consumindo a API por padrão (`EXPO_PUBLIC_DATA_SOURCE=api`), com o repositório em
      memória atrás de `memory` para desenvolvimento offline.
- [x] Formulário de criação e de edição compartilhado, com mensagem de erro do backend exibida
      em pt-BR.
- [x] Ids de caminho validados como UUID: id malformado responde 400 em vez de estourar 500 no
      Postgres.
- [x] Nome obrigatório rejeita string vazia **e** string só com espaços, na criação e no patch.
- [x] 17 testes unitários + 26 e2e, lint e typecheck limpos nos dois apps.

### Resultado da fase

Ao final desta fase:

> O organizador consegue criar um evento e acessar o espaço onde o mapa será construído.

---

# Fase 2 — Mapeamento do ambiente

**Objetivo:** permitir que o organizador percorra fisicamente o local e transforme seus trajetos em dados.

### Sprint 3 — Exibição do mapa

* [x] Integrar `react-native-maps` ao Expo.
* [x] Criar componente `EventMap`.
* [x] Renderizar marcadores.
* [x] Renderizar linhas/polilinhas.
* [x] Definir sistema de coordenadas.

**Entregue além da lista, e verificado:**

- [x] Sistema de coordenadas fechado: WGS84 em graus decimais, o mesmo do `expo-location` até o
      `Path.geometry` gravado como JSON (PRD §25, sem PostGIS). `Coordinates` (leitura do GPS) e
      `Coordinate` (`[latitude, longitude]`, o que se grava e se desenha) são tipos distintos, e
      `toLatLng` em `mobile/src/utils/geo.ts` é a única conversão para o `react-native-maps`.
- [x] `EventMap` é o único arquivo do app que importa `react-native-maps`; as telas do organizador
      e do participante passam a desenhar o mapa de verdade.
- [x] Enquadramento por conteúdo, com piso de 220 m e 48 px de folga: mapa de pavilhão tem poucos
      pontos e não pode abrir no zoom do planeta. A câmera só se move quando o conteúdo muda, nunca
      a cada render, para não tirar o mapa da mão de quem está arrastando.
- [x] Pino do marcador desenhado pelo app (disco com anel branco) em vez do pino do sistema, para
      o marcador não mudar de forma e cor entre plataformas; giro e inclinação desligados pela
      acessibilidade (RNF04), zoom e arraste mantidos.
- [x] Config plugin `react-native-maps` registrado em `app.json` sem chave: Apple Maps no iOS e
      Google Maps no Android. `PROVIDER_GOOGLE` e as chaves ficam para a publicação em loja.
- [x] Lint, typecheck e formatação limpos no mobile.

**Fora desta sprint, por decisão de escopo:** não há `Path` nem `PointOfInterest` no repositório até
as Sprints 5 e 7, então as telas de mapa mostram a base do mapa ainda sem marcadores nem
polilinhas — nada de geometria fictícia foi semeada para a demo. O desenho entra em uso quando o
primeiro caminho gravado chegar.

**Ajuste de escopo pedido durante a sprint, fechado no PRD §20:** o CRUD de evento e de navegação
ganhou o apagado, que não estava no plano. `DELETE /events/:eventId` e `DELETE /maps/:mapId`
respondem `204` sem corpo e `404` com a mensagem pt-BR quando o registro não existe; apagar o evento
leva as navegações junto pelo `ON DELETE CASCADE` que já existia na migração. No app, a ação fica no
corpo da tela "Ver detalhes" do organizador (`DeleteAction`), com diálogo de confirmação que repete o
nome do registro, e some depois de apagar com `router.dismissTo` para a lista. O participante não vê a
ação.

**Correção de navegação:** as listas e as telas de-details recarregam quando voltam a ficar em foco
(`useRefreshOnFocus`). Sem isso o evento criado ou apagado só aparecia depois de passar pela tela de
escolha de modo, porque uma tela de pilha não é remontada ao voltar e o `useAsyncData` carrega só na
montagem.

### Sprint 4 — Gravação GPS

* [x] Solicitar permissão de localização (`expo-location`).
* [x] Obter posição atual.
* [x] Iniciar tracking via `expo-location`.
* [x] Registrar coordenadas.
* [x] Exibir trajetória em tempo real.
* [x] Finalizar gravação.
* [x] Calcular distância aproximada.

> **Itens do plano que saíram do escopo:** "Pausar gravação" e "Retomar gravação". Ver a decisão
> abaixo e o PRD §9.2.

**Entregue além da lista, e verificado:**

- [x] A gravação é uma rota própria, `/organizer/event/[eventId]/map/[mapId]/record`, e
      `/organizer/event/[eventId]/map/[mapId]` virou o hub: mostra o mapa e tem o botão
      "Mapear novo caminho". É o fluxo do PRD §9.2 e é o que a Sprint 5 precisa — a tela
      do hub é onde a lista de caminhos salvos vai entrar.
- [x] `usePathRecording` (`src/hooks/`) é a máquina de estado; a tela desenha e não
      decide. Estados: `idle` → `starting` → `recording` → `finished`, com `start`,
      `finish` e `discard`.
- [x] O resultado da permissão **é lido**: GPS desligado e permissão negada viram erro
      em pt-BR na tela, e a gravação não começa. O protótipo anterior ignorava o retorno e
      "começava" uma gravação que não gravava nada.
- [x] Status do GPS visível durante a gravação (PRD §9.2): tempo, distância, contagem de
      pontos, qualidade do sinal pela `accuracy` da última leitura e quantas leituras foram
      descartadas. A qualidade vira texto porque o mapa é um gráfico (RNF04).
- [x] Filtro de leitura antes de entrar no trajeto, em `src/utils/recording.ts`:
      precisão acima de 30 m, espaçamento menor que 1 m e salto acima de 3 m/s. Este era o
      item de §11 — Pontos futuros, e ele tinha que entrar **antes** da Sprint 5, porque
      depois que o ponto estiver no `Path.geometry` ele já entra no cálculo de rota como
      dado (Sprint 17). Registrado no PRD §9.2.
- [x] A distância mostrada é a **soma dos trechos aceitos**, ou seja, o comprimento do
      trajeto desenhado — não o caminho percorrido. Somar o trecho de uma leitura
      descartada contaria o mesmo metro várias vezes, porque todas as leituras ruins em
      sequência são medidas contra o mesmo último ponto aceito.
- [x] A câmera segue o organizador durante a gravação sem brigar com o reenquadramento
      automático da Sprint 3. `EventMap` ganhou `cameraToFollow`/`onCameraSettled` para
      isso: quem passa a câmera desliga o `fitToCoordinates`, senão o trajeto crescendo
      puxaria a câmera para o centro do percurso a cada ponto. Antes do primeiro fix a
      tela mostra "Aguardando o GPS" no lugar do mapa, porque `initialRegion` só vale na
      montagem e o mapa abriria no zoom do planeta.
- [x] Finalizar mostra o trajeto em modo leitura com o resumo e **diz que não salvou** — a
      Sprint 5 troca o aviso pelo `POST /paths`. Um trajeto com um único ponto avisa que um
      ponto não forma caminho.
- [x] Nada na gravação toca a rede, que é o que faz o RNF05 valer sem fila: perda
      temporária de conexão não interrompe o mapeamento.
- [x] 28 testes unitários dos limiares, do filtro, da distância e dos formatadores, com
      vitest no mobile (o mesmo runner do backend); lint, typecheck e formatação limpos.

**O que ainda precisa de aparelho físico.** O que foi verificado nesta sprint: lint, typecheck,
28 testes unitários e o bundle de iOS exportando sem erro (`expo export`, o que prova que todo
import resolve no Metro). O que **não** foi verificado, e não pode ser em simulador: a qualidade
real do trajeto, o acompanhamento de câmera enquanto a pessoa caminha, os diálogos de permissão do
iOS e do Android, e o aviso de precisão reduzida. Simulador e emulador devolvem posição sintética
e o `accuracy` de lá não significa nada — a verificação de ponta a ponta da gravação fica para a
Sprint 21, que é a que exige aparelho de verdade.

**Gravação sem pausa, por decisão de equipe:** a pausa e a retomada saíram do escopo.
Quem percorre um pavilhão não precisa pausar o trajeto — pausa o lugar, não a
caminhada — e a pausa criaria dois caminhos na mesma sessão, com a decisão de onde um
termina e o outro começa. Interromper é **finalizar** (fecha o trajeto) ou **descartar**
(joga fora e volta a zero). O PRD §9.2 foi atualizado: ele pedia "botão para pausar", e a
fonte de verdade não pode divergir da implementação. O botão de pausa que existia na
Sprint 3 do protótipo era pior que inútil: ele parava o cronômetro e deixava o GPS
continuar acrescentando pontos por baixo, então o trajeto crescia durante a pausa.

**Gravação só com o app na frente:** a assinatura é do `expo-location` em primeiro plano,
então sair para a tela de bloqueio ou para outra tela interrompe a entrega de posição.
Tratar isso (serviço de primeiro plano com notificação permanente no Android,
`allowsBackgroundLocationUpdates` no iOS) está fora do MVP e está registrado como
limitação no PRD §30. A tela de gravação avisa que o app precisa ficar aberto.

**O que a Sprint 5 herda:** `Path.geometry` é a `MapGeometry` que a gravação já produz em
memória, e a distância em metros que a tela mostra é a que o `Path` vai gravar. O que
falta é o `POST /paths` e a lista de caminhos na tela-hub.

### Sprint 5 — Persistência dos caminhos

Criar os modelos:

```text
Map
Path
```

* [x] Criar mapa. — já existia da Sprint 2 (`Map` + `GET`/`POST /events/:eventId/maps`)
* [x] Salvar caminhos.
* [x] Buscar caminhos.
* [x] Excluir caminhos.
* [x] Renderizar caminhos salvos.

**Entregue além da lista, e verificado:**

- [x] `Path` como entidade de verdade: `src/paths/path.entity.ts`, migração
      `1730000001000-CreatePaths` com `geometry` em `jsonb`, `distance` em `real`,
      `mapId` com `ON DELETE CASCADE` e índice. Apagar a navegação leva os caminhos
      junto, e o repositório em memória espelha isso.
- [x] `POST /maps/:mapId/paths`, `GET /maps/:mapId/paths`, `GET /paths/:pathId` e
      `DELETE /paths/:pathId` (`204` sem corpo), com o mesmo desenho dos endpoints de
      navegação: `mapId` vem da rota e nunca do corpo, e id malformado responde `400`
      pelo `ParseUuidPipe` em vez de estourar `500` no Postgres.
- [x] **A distância é calculada pelo servidor, e não aceita do app.** `pathLengthInMeters`
      soma os trechos da geometria com haversine e arredonda na décima, e o corpo do
      `POST` é só `{ geometry }`. Motivo: com a coluna e o número da tela como
      entradas independentes, o cálculo de rota da Sprint 16 ordenaria distâncias e a
      tela de gravação mostraria outra, e nenhum dos dois lados teria como acusar o
      erro. Registrar o derivado perto de quem o derivou também tira a soma do
      filter do app do caminho crítico.
- [x] `geometryLengthInMeters` no mobile existe **para o repositório em memória
      concordar com a API** — as duas implementações devolvem o mesmo número, e há
      teste dos dois lados. A tela de gravação não usa a função: ela soma trecho a
      trecho a cada leitura aceita, porque recalcular a geometria inteira a cada
      ponto seria quadrático no tamanho do trajeto. As duas contas dão o mesmo
      valor, e essa é a razão de o filtro da Sprint 4 somar só o que entra no
      desenho.
- [x] **Coluna por etapa, e não o `Path` inteiro de uma vez.** `startNodeId` e
      `endNodeId` dependem dos pontos de interesse, que só existem na Sprint 7 — uma
      chave estrangeira para um nó que o app não cria seria um `404` no meio da
      gravação. `accessibilityStatus`, `width`, `hasStairs`, `hasRamp`, `floorType` e
      `notes` são da Sprint 9. Criar tudo agora faria o schema afirmar que o app
      sabe preencher o que não tem tela para preencher. Registrado no PRD §23.
- [x] Geometria inválida responde com **uma** mensagem. `@IsArray` com `@ArrayMinSize`
      empilhado é o jeito obvio e produz quatro frases para o mesmo corpo
      (`"geometry": "entrada-elevador"` devolvia "não é uma lista", "tem pontos
      demais", "precisa de pelo menos 2 pontos" e "cada ponto deve ser um par"), e o
      app mostra a lista inteira. `IsPathGeometry` devolve o primeiro problema e a
      frase dele. `@IsCoordinateTuple` existe porque o `class-validator` não tem
      validador para tupla numérica — `@ValidateNested` espera uma classe, e a
      geometria é uma lista de pares.
- [x] Trajeto degenerado é recusado com `400`: uma geometria de pontos todos iguais
      passa na validação de formato — é uma lista de coordenadas válidas — e viraria
      uma aresta de comprimento zero na Sprint 16, quando já não daria para saber de
      onde veio.
- [x] No app, finalizar virou "Salvar no mapa": o `POST` acontece só quando o
      organizador confirma, o erro da API aparece na tela em vez de sumir com a
      gravação, e o trajeto continua em memória para tentar de novo sem percorrer o
      local outra vez. A tela de resumo deixou de dizer que não salvava.
- [x] O hub virou a lista que a Sprint 4 empurrou para baixo: os caminhos salvos
      aparecem desenhados no `EventMap` e em linhas com distância, contagem de pontos
      e data e hora da gravação. Navegação e caminhos são carregados **separados** —
      a lista falhar não pode apagar o mapa da tela — e o `useRefreshOnFocus`
      recarrega os dois, então o caminho salvo em `/record` aparece ao voltar sem
      passar pela tela de escolha de modo.
- [x] Apagar caminho é por linha, com `Dialog` destrutivo repetindo distância e
      data, botão ocupado enquanto o pedido está em voo e erro da API dentro do
      diálogo. É a mesma regra do `DeleteAction`, que é de tela de detalhes: ação
      irreversível no corpo da tela, longe do menu do cabeçalho.
- [x] Caminho **não tem nome** nesta sprint, e a lista não finge que tem: o que
      identifica a linha é onde a pessoa andou, quanto deu e quando. Nomear é da
      Sprint 6, junto com editar e selecionar o caminho.
- [x] `polylinesFromPaths` em `src/utils/mapContent.ts`, com teste: caminho de um
      ponto só ou com coordenada fora do globo não vira polilinha, e o `tone` fica no
      padrão — pintar o caminho de uma cor que sugere acessibilidade seria vender o
      que o PRD §19 diz que ninguém verificou.
- [x] `formatDateTime` para a lista, com hora junto: duas caminhadas no mesmo dia são
      a regra em um pavilhão, e `02/09/2026` não diz qual trajeto é qual.
- [x] 38 testes unitários e 52 e2e no backend, 37 no mobile, lint, typecheck e
      formatação limpos nos dois apps, e o bundle de iOS exportando sem erro.

**Verificado contra o PostgreSQL de verdade** (`docker compose up -d --build`), não
só por e2e com dublês:

- [x] Migração aplicada (`Aplicada: CreatePaths1730000001000`) e `\d paths` confere
      com a entidade: `geometry jsonb`, `distance real`, `mapId` com
      `paths_map_id_fk ... ON DELETE CASCADE` (`confdeltype = c`) e `paths_map_id_idx`.
- [x] **A distância do servidor bate com a do app.** A geometria de 4 pontos em São
      Paulo devolveu `36.4 m`, e a soma em Python com a fórmula do `geo.ts` do mobile
      dá `36.3975` → `36.4`. A ida e volta de meio grau em Recife devolveu
      `111194.9` dos dois lados. É a paridade que o repositório em memória promete,
      conferida com a API no ar em vez de só por leitura de código.
- [x] `POST` → `201` com o caminho salvo; `GET /maps/:mapId/paths` em ordem de
      criação; `GET /paths/:pathId` → `200`; `DELETE` → `204` e o `GET` seguinte
      `404`.
- [x] `jsonb` guarda a geometria como array (`jsonb_typeof = array`,
      `jsonb_array_length = 4`), sem serializar como string.
- [x] Erros no banco real: `distance` no corpo → `400`; geometria string, um ponto
      só, latitude fora do globo e comprimento zero → `400` com **uma** mensagem
      cada; `mapId` malformado → `400`; mapa e caminho inexistentes → `404`.
- [x] **Cascade conferido contando linhas:** o mapa tinha 1 caminho, `DELETE` do mapa
      devolveu `204` e o caminho foi junto (`1` → `0`). Na cadeia inteira, evento com
      mapa e caminho apagou os dois (`maps=1 paths=1` → `maps=0 paths=0`).
- [x] `revert` da `CreatePaths` derruba a tabela e `run` recria — migração que não
      volta é armadilha para quem precisar desfazer em ambiente de teste.

**O que continua pendente.** Só o que não tem como ser verificado sem aparelho:
percurso real de GPS, câmera e permissão de localização, como a Sprint 4 anotou.

**Aberto e decidido no meio da sprint: a mensagem de campo fora do contrato.** O
`forbidNonWhitelisted` do `ValidationPipe` global respondia
`property distance should not exist`, em inglês — o único texto de erro que o app
mostrava sem ser pt-BR, porque não vem de um DTO e sim do `class-validator`. O
`exceptionFactory` em `src/app.setup.ts` troca por
`O campo "distance" não faz parte deste recurso.`, e a troca é global de propósito:
a regra é global, e traduzir por endpoint deixaria a mesma classe de erro com dois
comportamentos na API. Alterar o `ValidationPipe` é mexer no contrato de erro de
todos os endpoints com DTO, então foi uma decisão à parte, com o commit da
Sprint 5 — e não uma feature escondida no meio da persistência.

### Resultado da fase

O organizador consegue:

> abrir um mapa → iniciar uma gravação → caminhar pelo local → finalizar → visualizar o caminho registrado.

---

# Fase 3 — Construção e edição do mapa

**Objetivo:** transformar os trajetos brutos em um mapa utilizável.

### Sprint 6 — Editor de mapa

* [ ] Selecionar caminho.
* [ ] Editar caminho.
* [ ] Excluir caminho.
* [ ] Adicionar ponto.
* [ ] Mover ponto.
* [ ] Excluir ponto.

### Sprint 7 — Pontos de interesse

Criar os tipos:

```text
Entrada
Saída
Banheiro
Banheiro acessível
Elevador
Escada
Rampa
Auditório
Sala
Alimentação
Atendimento
Posto médico
Outro
```

* [ ] Criar `PointOfInterest`.
* [ ] Adicionar ponto.
* [ ] Posicionar ponto.
* [ ] Mover ponto.
* [ ] Editar ponto.
* [ ] Remover ponto.

### Sprint 8 — Áreas

* [ ] Criar modo "Desenhar área".
* [ ] Adicionar vértices.
* [ ] Fechar polígono.
* [ ] Salvar área.
* [ ] Editar área.
* [ ] Remover área.
* [ ] Definir nome e tipo.

Exemplos:

* Praça de alimentação;
* Salão;
* Área de exposição;
* Foyer;
* Auditório.

### Resultado da fase

O organizador consegue transformar os caminhos registrados em uma representação navegável:

```text
                 🚻 Banheiro
                      │
                      │
🚪 Entrada ───────────┼──────── 🛗 Elevador
                      │
                      │
                   🎤 Auditório
```

---

# Fase 4 — Camada de acessibilidade

**Objetivo:** adicionar as informações necessárias para que o sistema consiga diferenciar caminhos acessíveis de caminhos inadequados.

### Sprint 9 — Características dos caminhos

Adicionar:

```text
accessibilityStatus
hasStairs
hasRamp
width
floorType
notes
```

O organizador poderá informar:

* acessível;
* não acessível;
* não verificado;
* presença de escadas;
* presença de rampas;
* largura;
* tipo de piso;
* observações.

### Sprint 10 — Informações dos pontos

Adicionar informações de acessibilidade aos pontos.

Exemplos:

**Elevador**

* atende quais andares;
* observações.

**Banheiro**

* acessível;
* banheiro convencional;
* observações.

**Rampa**

* acessível;
* observações.

### Sprint 11 — Validação e atualização

* [ ] Registrar data da última verificação.
* [ ] Exibir status de verificação.
* [ ] Permitir atualizar informações.
* [ ] Exibir informações desatualizadas.

Exemplo:

```text
Informações verificadas em:
28/09/2026
```

### Resultado da fase

O mapa deixa de ser apenas uma representação espacial e passa a possuir **dados de acessibilidade utilizáveis pelo algoritmo de navegação**.

---

# Fase 5 — Navegação do participante

**Objetivo:** permitir que uma pessoa utilize o mapa para encontrar um destino.

### Sprint 12 — Visualização do mapa

* [ ] Listar eventos publicados.
* [ ] Abrir evento.
* [ ] Visualizar mapa.
* [ ] Visualizar pontos.
* [ ] Visualizar áreas.
* [ ] Consultar informações.

### Sprint 13 — Localização manual

* [ ] Criar modo "Definir minha localização".
* [ ] Selecionar ponto no mapa.
* [ ] Confirmar localização.
* [ ] Alterar localização.

Fluxo:

```text
Definir localização
        ↓
Selecionar no mapa
        ↓
Confirmar
        ↓
Você está aqui
```

### Sprint 14 — QR Codes

#### Organizador

* [ ] Gerar QR Code.
* [ ] Associar QR Code a um ponto.
* [ ] Visualizar QR Code.
* [ ] Compartilhar/imprimir.

#### Participante

* [ ] Abrir scanner (`expo-camera`).
* [ ] Ler QR Code.
* [ ] Identificar evento.
* [ ] Identificar ponto.
* [ ] Definir localização.

Fluxo:

```text
QR Code
   ↓
Entrada principal
   ↓
"Você está aqui"
```

### Sprint 15 — Seleção de destino

* [ ] Buscar destino.
* [ ] Listar pontos.
* [ ] Filtrar por categoria.
* [ ] Selecionar destino.
* [ ] Exibir destino no mapa.

Exemplo:

```text
Para onde você quer ir?

🔎 Buscar

🚻 Banheiro
🛗 Elevador
🎤 Auditório
🍴 Alimentação
🚪 Saída
```

### Resultado da fase

O participante consegue:

> abrir um evento → definir onde está → escolher para onde quer ir.

---

# Fase 6 — Roteamento e entrega

**Objetivo:** transformar o mapa em um sistema de navegação acessível e finalizar o MVP.

### Sprint 16 — Algoritmo básico de rotas

Transformar o mapa em um grafo:

```text
        B
       / \
      /   \
     A     D
      \   /
       \ /
        C
```

* [ ] Definir nós.
* [ ] Definir arestas.
* [ ] Calcular distância.
* [ ] Implementar Dijkstra ou A*.
* [ ] Encontrar menor caminho.

Primeiro sem restrições:

> origem → destino = menor caminho.

### Sprint 17 — Rotas acessíveis

Adicionar restrições.

Exemplo:

```text
☑ Evitar escadas
☑ Evitar caminhos não acessíveis
```

O algoritmo deve remover caminhos incompatíveis antes de calcular a rota.

Exemplo:

```text
Entrada
  │
  ├──── 🪜 Escada ────┐
  │                   │
  └──── 🛗 Elevador ──┤
                      ↓
                  🚻 Banheiro
```

Para um usuário que evita escadas, a primeira opção não pode fazer parte da rota.

### Sprint 18 — Visualização da rota

* [ ] Destacar rota.
* [ ] Mostrar origem.
* [ ] Mostrar destino.
* [ ] Mostrar distância.
* [ ] Mostrar características.
* [ ] Mostrar pontos intermediários.
* [ ] Informar quando não existe rota compatível.

Exemplo:

```text
🚻 Banheiro acessível

85 m

✓ Sem escadas
✓ Caminho acessível
✓ Rampa
```

### Sprint 19 — Publicação

Criar estados:

```text
DRAFT
PUBLISHED
ARCHIVED
```

* [ ] Organizador edita rascunho.
* [ ] Organizador publica.
* [ ] Participante só vê mapas publicados.
* [ ] Organizador pode despublicar.

### Sprint 20 — Teste integrado

Executar o fluxo completo:

```text
Organizador
    ↓
Cria evento
    ↓
Cria mapa
    ↓
Percorre caminhos
    ↓
Adiciona pontos
    ↓
Configura acessibilidade
    ↓
Gera QR Code
    ↓
Publica
    ↓
Participante
    ↓
Escaneia QR Code
    ↓
Escolhe destino
    ↓
Seleciona restrições
    ↓
Recebe rota
```

### Sprint 21 — Refinamento e apresentação

* [ ] Corrigir bugs críticos.
* [ ] Melhorar UX.
* [ ] Melhorar acessibilidade da interface.
* [ ] Testar em dispositivos físicos.
* [ ] Testar GPS.
* [ ] Testar QR Codes.
* [ ] Testar casos sem rota disponível.
* [ ] Criar ambiente de demonstração.
* [ ] Preparar apresentação.
* [ ] Documentar arquitetura.

---

# 7. Resumo das fases

| Fase                        | Objetivo                       | Sprints |
| --------------------------- | ------------------------------ | ------- |
| **1. Fundação**             | Estrutura do projeto e eventos | 0–2     |
| **2. Mapeamento**           | GPS e caminhos                 | 3–5     |
| **3. Construção do mapa**   | Pontos e áreas                 | 6–8     |
| **4. Acessibilidade**       | Características e validação    | 9–11    |
| **5. Participante**         | Localização e destinos         | 12–15   |
| **6. Roteamento e entrega** | Rotas e MVP final              | 16–21   |

---

# 8. Marcos do projeto

### Marco 1 — Aplicativo funcional

**Após Fase 1**

O projeto abre, possui navegação e permite criar eventos.

### Marco 2 — Mapa funcional

**Após Fase 2**

É possível percorrer um local e registrar seus caminhos.

### Marco 3 — Mapa editável

**Após Fase 3**

É possível adicionar pontos e áreas ao mapa.

### Marco 4 — Mapa acessível

**Após Fase 4**

Os caminhos possuem informações de acessibilidade.

### Marco 5 — Navegação

**Após Fase 5**

Um participante consegue escolher origem e destino.

### Marco 6 — MVP completo

**Após Fase 6**

O sistema consegue:

> **Mapear → cadastrar acessibilidade → localizar participante → escolher destino → calcular rota acessível.**

---

# 9. Estratégia caso o prazo aperte

Se o grupo perceber que não conseguirá implementar tudo, o corte deve ocorrer de trás para frente.

## Manter obrigatoriamente

```text
GPS
↓
Caminhos
↓
Pontos
↓
Acessibilidade
↓
Localização
↓
Destino
↓
Roteamento
```

## Cortar primeiro

```text
Áreas complexas
↓
QR Codes
↓
Publicação avançada
↓
Histórico de verificação
↓
Funcionalidades secundárias
```

O **QR Code é importante para a experiência final**, mas não deve bloquear o desenvolvimento do algoritmo de rotas. Durante o desenvolvimento, a localização manual pode ser utilizada.

---

# 10. Regra geral das sprints

Cada sprint deve terminar com uma funcionalidade integrada e testável.

O ciclo recomendado é:

```text
Planejar
   ↓
Implementar
   ↓
Integrar
   ↓
Testar
   ↓
Demonstrar
```

A equipe deve evitar acumular várias funcionalidades parcialmente implementadas. O objetivo é manter o projeto sempre em um estado executável e demonstrável.

---

# 11. Pontos futuros

Melhorias discutidas e **deixadas de fora de propósito** — não são pendências do MVP. Estão aqui
para a decisão não se perder, não para entrar no backlog do MVP.

## Precisão da localização (`expo-location`)

`mobile/src/services/locationService.ts` continua pedindo `Location.Accuracy.High` nas duas leituras. O
enum tem dois níveis acima dele: `Highest` e `BestForNavigation` ("o maior possível, usando dados
adicionais de sensores para apps de navegação"). Subir o nível é a alavanca mais barata e custa
bateria, então fica para quando a gravação mostrar que `High` não basta — a gravação da Sprint 4 já
existe, mas o filtro de leitura abaixo resolve o caso comum antes de qualquer configuração.

O que **não** é alavanca é o `accuracy` pedido: o teto de precisão é definido pela **permissão
concedida**, e é dela que vem quase todo o problema.

- **iOS 14+** — `PermissionDetailsLocationIOS.accuracy` é `'full' | 'reduced'`. Em `'reduced'` a
  posição é aproximada, e o iOS **não deixa o app perguntar de novo**: uma segunda
  `requestForegroundPermissionsAsync` falha em silêncio e devolve `denied`. A única saída é levar a
  pessoa aos Ajustes com `Linking.openSettings('app-settings:')`. `getLocationPermissionStatus`
  expõe `isPrecise` e a gravação já mostra um aviso quando a permissão veio reduzida, mas **nada no
  app oferece o atalho para os Ajustes** — foi decisão de equipe não abrir essa tela na Sprint 4, e
  continua sendo o item pendente quando alguém quiser recuperar a precisão.
- **Android** — `PermissionDetailsLocationAndroid.accuracy` é `'fine' | 'coarse' | 'none'`, e
  `coarse` dá precisão de cidade. `Location.enableNetworkProviderAsync()` pede à pessoa que ligue o
  modo de alta precisão (Wi-Fi + rede + GPS); fica para a gravação em background, porque ele puxa
  foreground service e notificação permanente.

**O item que realmente importa — o filtro por `coords.accuracy` — foi fechado na Sprint 4.** Num
pavilhão o GPS degrada, e cada correção ruim gravada entra no cálculo de rota como dado — o Sprint 17
trata as arestas como dado, não como peso, então a sujeira fica. Descartar a correção é mais barato
que qualquer configuração de precisão. Os três limiares (precisão, espaçamento e salto) estão em
`mobile/src/utils/recording.ts`, com teste, e as regras no PRD §9.2.

**Limites que não são de software:** posicionamento interno de precisão exigiria beacon, UWB ou
fingerprinting de Wi-Fi, e o PRD §5 põe beacon e posicionamento interno de alta precisão fora do
MVP. O teto real do app é a qualidade do GPS/Wi-Fi do aparelho no local. E precisão só se avalia em
aparelho físico: simulador e emulador devolvem posição sintética, e o `accuracy` de lá não significa
nada — foi por isso que a gravação da Sprint 4 **não** foi verificada em simulador.
