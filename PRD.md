# PRD — Plataforma de Acessibilidade em Eventos

## 1. Visão geral

### 1.1 Nome provisório

**AccessEvent**

Nome temporário. Deve ser substituído posteriormente por um nome definido pelo grupo.

### 1.2 Objetivo

Desenvolver um aplicativo mobile em **React Native** que permita a organizadores de eventos mapear a estrutura navegável de um local e cadastrar informações de acessibilidade.

O organizador percorre fisicamente os caminhos do local utilizando o celular. O aplicativo registra sua trajetória por GPS e transforma essas trajetórias em uma representação visual do ambiente.

Após o mapeamento, o organizador pode editar o mapa, adicionar pontos de interesse e desenhar áreas, como:

* Banheiros;
* Elevadores;
* Escadas;
* Rampas;
* Entradas;
* Saídas;
* Auditórios;
* Salas;
* Áreas de alimentação;
* Outros locais relevantes.

Participantes com mobilidade reduzida podem consultar o mapa, informar sua localização e encontrar uma rota adequada até um determinado destino.

---

# 2. Problema

Pessoas com dificuldade de locomoção podem enfrentar dificuldades para se deslocar dentro de eventos, especialmente em locais desconhecidos.

Informações importantes como:

* localização de elevadores;
* banheiros acessíveis;
* rampas;
* escadas;
* entradas acessíveis;
* caminhos sem obstáculos;

nem sempre estão disponíveis de forma clara para os participantes.

Além disso, plantas arquitetônicas existentes geralmente não são adequadas para utilização direta por usuários comuns e podem exigir conhecimento técnico para interpretação.

O sistema busca transformar o espaço físico do evento em uma representação de navegação mais simples e orientada à acessibilidade.

---

# 3. Objetivos

## 3.1 Objetivo principal

Permitir que um organizador construa um mapa navegável e orientado à acessibilidade de um evento por meio do mapeamento presencial do local.

## 3.2 Objetivos específicos

* Registrar caminhos percorridos pelo organizador.
* Construir automaticamente uma representação visual desses caminhos.
* Permitir edição manual do mapa.
* Cadastrar pontos de interesse.
* Cadastrar características de acessibilidade dos caminhos.
* Permitir o desenho de áreas abertas.
* Permitir que participantes consultem o mapa.
* Permitir que participantes informem sua localização por QR Code ou manualmente.
* Encontrar rotas compatíveis com as restrições de acessibilidade selecionadas.
* Fornecer informações claras sobre as características da rota.

---

# 4. Escopo do MVP

O MVP deve contemplar apenas funcionalidades necessárias para demonstrar o conceito principal.

## Incluído

### Organizador

* Cadastro/login;
* Criação de evento;
* Criação de mapa;
* Modo de gravação de trajetos;
* Registro da trajetória via GPS;
* Visualização dos trajetos registrados;
* Edição do mapa;
* Criação de pontos de interesse;
* Criação de áreas;
* Configuração de características de acessibilidade;
* Geração de QR Codes para pontos de localização;
* Publicação do mapa.

### Participante

* Visualização de eventos disponíveis;
* Visualização do mapa;
* Leitura de QR Code;
* Seleção manual da localização no mapa;
* Seleção de destino;
* Seleção de necessidades/restrições de acessibilidade;
* Cálculo de rota;
* Visualização da rota;
* Visualização das características do caminho.

---

# 5. Fora do escopo do MVP

As seguintes funcionalidades não serão implementadas inicialmente:

* Reconhecimento automático de plantas baixas;
* Visão computacional;
* Reconstrução 3D;
* Google Street View indoor;
* Posicionamento por Bluetooth Beacon;
* Posicionamento indoor de alta precisão;
* Navegação turn-by-turn em tempo real;
* Reconhecimento automático de obstáculos;
* Medição automática de largura de corredores;
* Medição automática de inclinação de rampas;
* Integração com mapas externos;
* Integração com sistemas de gestão de eventos;
* Chat entre participante e organizador;
* Sistema de avaliação/reputação dos mapas.

Essas funcionalidades podem ser consideradas em versões futuras.

---

# 6. Personas

## 6.1 Organizador

Responsável por preparar o mapa de acessibilidade do evento.

### Objetivos

* Cadastrar rapidamente o espaço;
* Informar as características de acessibilidade;
* Disponibilizar informações confiáveis aos participantes;
* Atualizar o mapa quando houver alterações.

### Principais dificuldades

* Não possuir conhecimento técnico de arquitetura;
* Não possuir uma planta baixa adequada;
* Precisar mapear um espaço desconhecido;
* Precisar atualizar informações próximas ao evento.

---

## 6.2 Participante com mobilidade reduzida

Pessoa que participa de um evento e precisa encontrar caminhos compatíveis com suas necessidades.

### Objetivos

* Descobrir quais locais são acessíveis;
* Encontrar o caminho até determinado destino;
* Evitar escadas ou outros obstáculos;
* Saber previamente as características do caminho.

### Principais dificuldades

* Desconhecer o espaço;
* Não saber onde estão elevadores ou rampas;
* Encontrar informações de acessibilidade incompletas;
* Não saber se determinado caminho é adequado às suas necessidades.

---

# 7. Conceito do sistema

O sistema possui três componentes principais:

```text
┌─────────────────────┐
│     Organizador     │
└──────────┬──────────┘
           │
           │ cria / edita
           ↓
┌─────────────────────┐
│   Mapa do evento    │
└──────────┬──────────┘
           │
           │ consulta
           ↓
┌─────────────────────┐
│     Participante    │
└─────────────────────┘
```

O mapa é composto por:

1. **Nós** — pontos importantes;
2. **Arestas** — caminhos entre os pontos;
3. **Áreas** — regiões abertas ou ambientes;
4. **Atributos de acessibilidade** — características dos caminhos e pontos.

---

# 8. Modelo conceitual do mapa

## 8.1 Nós

Representam locais específicos.

Exemplos:

```text
Entrada
Elevador
Banheiro
Escada
Rampa
Auditório
Saída
```

Cada nó possui:

* identificador;
* nome;
* tipo;
* posição no mapa;
* descrição opcional;
* atributos de acessibilidade.

---

# 8.2 Caminhos

Representam trajetos navegáveis.

Um caminho possui:

* ponto inicial;
* ponto final;
* geometria;
* distância estimada;
* acessibilidade;
* características opcionais.

Exemplo:

```text
Entrada
   │
   │ 42m
   │
Elevador
```

---

# 8.3 Áreas

Representam espaços que não podem ser adequadamente representados apenas por um ponto.

Exemplos:

* praça de alimentação;
* salão;
* estacionamento;
* área de exposição;
* foyer;
* auditório.

Uma área será representada por um polígono.

---

# 9. Fluxo do organizador

## 9.1 Criar evento

O organizador informa:

* nome;
* descrição;
* endereço;
* data inicial;
* data final;
* imagem opcional.

Após criar o evento, o organizador pode criar seu mapa.

---

## 9.2 Iniciar mapeamento

O organizador seleciona:

> **Mapear novo caminho**

O aplicativo solicita autorização de localização.

Depois:

```text
Iniciar gravação
       ↓
Organizador percorre o caminho
       ↓
GPS registra coordenadas
       ↓
Organizador finaliza gravação
       ↓
Caminho é adicionado ao mapa
```

Durante a gravação devem ser exibidos:

* tempo de gravação;
* distância estimada;
* status do GPS;
* botão para finalizar.

O status do GPS mostra a qualidade do sinal a partir da precisão declarada pela
última leitura do sensor, e quantas leituras foram descartadas — o vídeo de um
organizador caminhando sem sinal nenhum é um caminho sem geometria, e o
organizador precisa saber disso na hora.

Ao finalizar, o aplicativo mostra o resumo do trajeto e só grava quando o
organizador confirma em "Salvar no mapa": antes disso o caminho existe só na tela.
A distância gravada é calculada pelo servidor a partir da geometria recebida, e não
aceita do aplicativo — um mesmo trajeto não pode ter duas distâncias, e o cálculo
de rota vai comparar essa coluna.

### A gravação não tem pausa

> **Decisão de equipe, fechada durante a Sprint 4:** a gravação não tem pausa nem
> retomada. Quem percorre um pavilhão não precisa pausar o trajeto — pausa o
> lugar, não a caminhada — e a pausa só criaria dois caminhos a mesma sessão, com
> a decisão de onde um termina e o outro começa. Interromper é **finalizar** (o
> que fecha o trajeto) ou **descartar** (o que joga fora e volta a zero).

### Descartes de leitura

> **Decisão de equipe, fechada durante a Sprint 4:** uma leitura do GPS só entra no
> caminho quando passa em três filtros, e o ponto descartado nunca chega ao banco:

| Filtro | Limiar | O que descarta |
| --- | --- | --- |
| Precisão | acima de 30 m | Sinal degradado, comum dentro de prédio. |
| Espaçamento | menos de 1 m do ponto anterior | Oscilação do sensor com o organizador parado. |
| Velocidade | acima de 3 m/s (≈11 km/h) entre pontos com 1 s ou mais de intervalo | Correção isolada longe da posição real, que viraria um pico de dezenas de metros. |

O motivo de descartar na gravação, e não confiar na melhor configuração de
precisão do aparelho, é que o ponto gravado vira dado: ele entra no
`Path.geometry` e, na Sprint 17, vira aresta do grafo que a rota percorre. A
qualidade da leitura é decidida pela permissão concedida ao app, não pelo app —
ver §30.

---

# 10. Edição do mapa

Após registrar os caminhos, o organizador pode editar o mapa.

## 10.1 Adicionar ponto

O organizador seleciona:

> Adicionar ponto

Categorias iniciais:

* Entrada;
* Saída;
* Banheiro;
* Banheiro acessível;
* Elevador;
* Escada;
* Rampa;
* Auditório;
* Sala;
* Alimentação;
* Atendimento;
* Posto médico;
* Outro.

O organizador posiciona o ponto sobre o mapa.

---

# 11. Características de acessibilidade

Cada caminho pode possuir características configuráveis.

### Acessibilidade

* Acessível;
* Não acessível;
* Não verificado.

### Escadas

* Possui escada;
* Não possui escada.

### Rampa

* Possui rampa;
* Não possui rampa.

### Largura

Opcionalmente:

* Menos de 80 cm;
* 80–100 cm;
* Mais de 100 cm;
* Não informado.

### Piso

* Regular;
* Irregular;
* Não informado.

### Observações

Campo de texto livre.

Exemplo:

> "Existe uma pequena elevação próxima à entrada do banheiro."

---

# 12. Desenho de áreas

O organizador pode selecionar:

> **Adicionar área**

e desenhar um polígono sobre o mapa.

Cada área possui:

* nome;
* tipo;
* descrição;
* características de acessibilidade.

Exemplo:

```text
┌──────────────────────────────┐
│                              │
│     Praça de Alimentação     │
│                              │
│                              │
└──────────────────────────────┘
```

---

# 13. QR Codes

O sistema deverá permitir a criação de QR Codes associados a pontos do mapa.

Exemplo:

```text
QR-001 → Entrada principal
QR-002 → Elevador térreo
QR-003 → Auditório principal
QR-004 → Praça de alimentação
```

Quando o participante escanear um QR Code:

```text
QR Code
   ↓
Identificador
   ↓
Evento
   ↓
Ponto associado
   ↓
Localização atual do usuário
```

O aplicativo então define automaticamente aquele ponto como a localização atual.

---

# 14. Localização manual

Além do QR Code, o participante poderá selecionar sua localização manualmente.

Fluxo:

```text
"Definir minha localização"
          ↓
      Mapa aberto
          ↓
Usuário toca em um ponto
          ↓
"Estou aqui"
```

Essa funcionalidade serve como alternativa quando não houver um QR Code próximo.

---

# 15. Fluxo do participante

## 15.1 Selecionar evento

O usuário escolhe o evento que deseja visitar.

---

## 15.2 Definir localização

Opções:

```text
Como deseja informar sua localização?

[ Escanear QR Code ]

[ Selecionar no mapa ]
```

---

## 15.3 Escolher destino

Exemplo:

```text
Para onde você deseja ir?

🔎 Buscar destino

🚻 Banheiro
🛗 Elevador
🎤 Auditório
🍴 Alimentação
🚪 Saída
```

---

# 16. Perfil de acessibilidade

Para o MVP, o usuário poderá informar restrições relevantes para o cálculo da rota.

Exemplo:

```text
Quero evitar:

☑ Escadas
☑ Caminhos não acessíveis
☐ Rampas
☐ Pisos irregulares
```

Uma configuração mais simples também pode ser utilizada inicialmente:

> **"Preciso de uma rota sem escadas."**

---

# 17. Cálculo de rotas

O mapa será representado como um grafo.

```text
        B
       / \
      /   \
     A     D
      \   /
       \ /
        C
```

Cada caminho representa uma aresta.

O algoritmo deverá considerar os atributos de acessibilidade.

Por exemplo:

```text
A → B
escada = sim

A → C
escada = não
```

Se o usuário não puder utilizar escadas, o caminho:

```text
A → B
```

será removido das possibilidades.

O sistema então procurará a melhor rota entre as alternativas restantes.

---

# 18. Resultado da rota

A tela deverá apresentar:

```text
Banheiro acessível

Distância aproximada:
85 m

Tempo estimado:
2 min

Características:
✓ Sem escadas
✓ Caminho acessível
✓ Possui rampa

[ Ver rota ]
```

A rota deverá ser destacada visualmente no mapa.

---

# 19. Confiança das informações

O aplicativo não deve afirmar que uma rota é objetivamente "segura".

As informações são fornecidas pelo organizador.

O sistema deverá deixar claro:

> **Informações baseadas no mapeamento realizado pelo organizador do evento.**

Opcionalmente, cada informação poderá possuir:

* data da última verificação;
* status de verificação.

Exemplo:

```text
Última verificação:
28/09/2026
```

---

# 20. Requisitos funcionais

## RF01 — Cadastro de organizador

O sistema deve permitir que um organizador crie uma conta.

## RF02 — Cadastro de evento

O organizador deve conseguir criar, consultar, editar e apagar eventos. Apagar um evento apaga
também as navegações registradas nele.

## RF03 — Criação de mapa

O organizador deve conseguir criar um mapa associado ao evento, renomeá-lo e apagá-lo.

## RF04 — Gravação de caminho

O aplicativo deve registrar a localização do dispositivo enquanto o organizador percorre um caminho.

## RF05 — Finalização de caminho

O organizador deve conseguir finalizar uma gravação e adicionar o caminho ao mapa.

## RF06 — Visualização dos caminhos

O sistema deve exibir os caminhos registrados sobre o mapa.

## RF07 — Adição de pontos

O organizador deve conseguir adicionar pontos de interesse.

## RF08 — Edição de pontos

O organizador deve conseguir mover, editar e remover pontos.

## RF09 — Criação de áreas

O organizador deve conseguir desenhar áreas no mapa.

## RF10 — Configuração de acessibilidade

O organizador deve conseguir definir atributos de acessibilidade.

## RF11 — Geração de QR Code

O sistema deve gerar QR Codes associados a pontos específicos.

## RF12 — Leitura de QR Code

O participante deve conseguir escanear QR Codes.

## RF13 — Localização manual

O participante deve conseguir definir sua localização manualmente.

## RF14 — Seleção de destino

O participante deve conseguir selecionar um ponto de interesse.

## RF15 — Configuração de restrições

O participante deve conseguir informar restrições de acessibilidade.

## RF16 — Cálculo de rota

O sistema deve calcular uma rota compatível com as restrições selecionadas.

## RF17 — Exibição de rota

O sistema deve exibir a rota no mapa.

---

# 21. Requisitos não funcionais

## RNF01 — Plataforma

O aplicativo mobile deverá ser desenvolvido utilizando **React Native**.

## RNF02 — Desempenho

A interface do mapa deve permanecer responsiva durante a navegação e edição.

## RNF03 — Usabilidade

As principais funcionalidades devem ser acessíveis sem conhecimento técnico.

## RNF04 — Acessibilidade

A própria interface do aplicativo deve considerar acessibilidade, incluindo:

* tamanho adequado de elementos;
* contraste;
* suporte a leitores de tela quando possível;
* textos claros;
* feedback visual.

## RNF05 — Offline

O mapeamento de caminhos deve idealmente continuar funcionando quando houver perda temporária de conexão.

A sincronização pode ocorrer posteriormente.

---

# 22. Arquitetura inicial

Uma arquitetura possível:

```text
React Native
     │
     ├── Organizer
     │     ├── Event Management
     │     ├── Map Editor
     │     ├── Path Recording
     │     └── Accessibility Management
     │
     └── Participant
           ├── Event Map
           ├── QR Scanner
           ├── Location Selection
           ├── Destination Search
           └── Route Navigation
                 │
                 ↓
              Backend API
                 │
          ┌──────┴──────┐
          ↓             ↓
      PostgreSQL      Storage
```

---

# 23. Modelo de dados inicial

## User

```text
id
name
email
password
role
createdAt
```

## Event

```text
id
name
description
address
startDate
endDate
organizerId
createdAt
```

## Map

```text
id
eventId
name
createdAt
updatedAt
```

## Path

```text
id
mapId
startNodeId
endNodeId
geometry
distance
accessibilityStatus
width
hasStairs
hasRamp
floorType
notes
```

As colunas chegam por etapa, na ordem em que o app passa a usá-las: `geometry` e
`distance` com a gravação do caminho (RF05), `startNodeId` e `endNodeId` quando
existirem os pontos que são as pontas do caminho, e os atributos de acessibilidade
na fase de acessibilidade. Criá-las todas de uma vez faria o schema afirmar que o
app sabe preencher o que ele ainda não tem como preencher.

## PointOfInterest

```text
id
mapId
name
type
position
description
accessibilityInfo
```

## Area

```text
id
mapId
name
type
geometry
description
```

## QRCode

```text
id
mapId
pointId
identifier
createdAt
```

---

# 24. Tecnologias sugeridas

## Mobile

* React Native
* TypeScript
* Expo
* Expo Router
* Expo Location
* Biblioteca de mapas compatível com React Native - react-native-maps
* Biblioteca de QR Code Scanner - expo-camera

**Princípio de escolha:** sempre que o ecossistema Expo oferecer um módulo ou
API para um problema, ele tem prioridade sobre bibliotecas externas. Exemplos:
Expo Router no lugar de navegação montada à mão, `expo-location` no lugar de
pacotes de geolocalização puros, `expo-camera` no lugar de pacotes de câmera.
Somente recorrer a bibliotecas externas quando o ecossistema Expo não tiver uma
solução adequada, ou quando houver uma justificativa técnica registrada no
`mobile/AGENTS.md`.

## Backend

* NestJS;
* PostgreSQL;
* PostGIS, caso seja necessário trabalhar com dados geográficos;
* REST API.

## Infraestrutura

Para o MVP:

* Docker;
* PostgreSQL;
* Backend hospedado em serviço cloud;
* Storage para imagens e dados auxiliares.

---

# 25. PostGIS

O uso de **PostGIS** é opcional, mas pode ser interessante caso o grupo queira trabalhar diretamente com dados geográficos.

Os caminhos poderiam ser armazenados como:

```text
LINESTRING
```

e os pontos como:

```text
POINT
```

Áreas:

```text
POLYGON
```

Isso facilita operações geoespaciais e cálculo de distâncias.

Para um MVP muito pequeno, entretanto, o grupo pode inicialmente armazenar as coordenadas como JSON e simplificar a infraestrutura.

---

# 26. Backlog do MVP

## Epic 1 — Autenticação

* [ ] Cadastro
* [ ] Login
* [ ] Logout
* [ ] Controle de papel do usuário

## Epic 2 — Eventos

* [ ] Criar evento
* [ ] Editar evento
* [ ] Listar eventos
* [ ] Publicar evento

## Epic 3 — Mapeamento

* [ ] Criar mapa
* [ ] Iniciar gravação GPS
* [ ] Pausar gravação
* [ ] Finalizar gravação
* [ ] Salvar trajetória
* [ ] Visualizar trajetória

## Epic 4 — Editor

* [ ] Adicionar ponto
* [ ] Mover ponto
* [ ] Remover ponto
* [ ] Editar ponto
* [ ] Criar área
* [ ] Editar área
* [ ] Remover área

## Epic 5 — Acessibilidade

* [ ] Configurar características dos caminhos
* [ ] Configurar características dos pontos
* [ ] Informar largura
* [ ] Informar escadas
* [ ] Informar rampas
* [ ] Informar piso

## Epic 6 — QR Codes

* [ ] Gerar QR Code
* [ ] Associar QR Code a ponto
* [ ] Ler QR Code
* [ ] Definir localização atual

## Epic 7 — Participante

* [ ] Listar eventos
* [ ] Abrir mapa
* [ ] Definir localização manual
* [ ] Escolher destino
* [ ] Configurar restrições
* [ ] Calcular rota
* [ ] Exibir rota

---

# 27. Critérios de sucesso do MVP

O MVP será considerado funcional quando for possível executar o seguinte cenário completo:

1. Organizador cria um evento.
2. Organizador cria o mapa.
3. Organizador percorre pelo menos três caminhos.
4. O aplicativo registra os caminhos.
5. Organizador adiciona:

   * uma entrada;
   * um elevador;
   * uma escada;
   * um banheiro.
6. Organizador configura quais caminhos possuem escadas.
7. Sistema gera um QR Code para a entrada.
8. Participante escaneia o QR Code.
9. Sistema identifica a entrada como localização inicial.
10. Participante seleciona o banheiro.
11. Participante informa que não pode utilizar escadas.
12. Sistema calcula uma rota alternativa.
13. A rota é exibida no mapa.

---

# 28. Cenário de demonstração

Para a apresentação do Projetão, o grupo pode montar um pequeno ambiente controlado.

Por exemplo:

```text
                 🚻 Banheiro
                      │
                      │
Entrada ──────────────┼──────── 🛗 Elevador
  📱                  │
 QR Code              │
                      │
                    🪜 Escada
```

O organizador percorre os caminhos previamente definidos.

Depois:

1. Publica o mapa;
2. Participante escaneia o QR Code da entrada;
3. Seleciona o banheiro;
4. Ativa "evitar escadas";
5. O aplicativo identifica que o caminho pela escada não pode ser utilizado;
6. A rota passa pelo elevador.

Esse cenário demonstra as principais partes do produto sem depender de um evento real.

---

# 29. Evoluções futuras

Após o MVP, algumas funcionalidades poderiam ser investigadas:

### Posicionamento indoor

Substituir ou complementar GPS por:

* Bluetooth Beacons;
* Wi-Fi positioning;
* UWB;
* sensores inerciais;
* ARCore/ARKit.

### Visão computacional

Permitir que o sistema interprete plantas baixas automaticamente e sugira:

* paredes;
* portas;
* corredores;
* escadas;
* elevadores;
* ambientes.

O organizador apenas validaria as sugestões.

### Reconstrução 3D

Permitir que o organizador escaneie o ambiente utilizando a câmera do smartphone.

### Medição automática

Utilizar AR para estimar:

* largura de portas;
* largura de corredores;
* inclinação de rampas;
* distâncias.

### Atualização colaborativa

Permitir que organizadores e participantes reportem:

* obstáculos temporários;
* elevadores indisponíveis;
* rotas bloqueadas;
* alterações no espaço.

### Informações em tempo real

Exemplo:

> ⚠️ Elevador temporariamente indisponível.

O sistema recalcularia as rotas automaticamente.

---

# 30. Limitações conhecidas do MVP

O MVP deverá assumir explicitamente algumas limitações:

* A precisão do GPS indoor não é garantida. Dentro de um pavilhão o sinal degrada,
  e o teto real do app é a qualidade do GPS e do Wi-Fi do aparelho no local:
  posicionamento interno de precisão exigiria beacon, UWB ou fingerprinting, e
  isso está fora do escopo (§5). A gravação descarta a leitura ruim em vez de
  gravar (§9.2), e por isso o trajeto resultante é sempre menos detalhado que o
  desenho real do corredor.
* A gravação é feita com o aplicativo aberto na frente. A Sprint 4 não registra
  posição em segundo plano: isso exigiria serviço de primeiro plano com
  notificação permanente no Android e `allowsBackgroundLocationUpdates` no iOS.
* As informações de acessibilidade dependem do cadastro realizado pelo organizador.
* O sistema não verifica automaticamente a largura ou condição física dos caminhos.
* O mapa pode não representar todos os detalhes arquitetônicos do ambiente.
* O QR Code depende de sua instalação em pontos adequados.
* Informações podem ficar desatualizadas caso o espaço seja alterado.
* O sistema não garante que uma rota seja fisicamente segura; ele calcula uma rota com base nas informações cadastradas.

Essas limitações devem ser apresentadas como parte do escopo do MVP, e não como funcionalidades que o sistema pretende resolver inicialmente.
