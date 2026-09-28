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
* [x] Configurar navegação (React Navigation).
* [x] Configurar `expo-location`.
* [x] Criar backend.
* [x] Configurar PostgreSQL.
* [x] Configurar Docker.
* [x] Criar repositório.
* [x] Configurar variáveis de ambiente.
* [x] Criar endpoint `/health`.

### Sprint 1 — Navegação básica

Criar a estrutura de telas:

```text
Home
├── Eventos
├── Meus eventos
└── Perfil

Organizador
├── Criar evento
├── Meus eventos
└── Editar mapa

Participante
├── Eventos
├── Mapa
└── Rota
```

* [ ] Criar navegação.
* [ ] Criar telas principais.
* [ ] Criar componentes básicos.
* [ ] Criar estados de loading/error.

### Sprint 2 — Eventos

* [ ] Criar evento.
* [ ] Listar eventos.
* [ ] Visualizar evento.
* [ ] Editar evento.
* [ ] Criar modelo `Event`.
* [ ] Criar endpoints de eventos.

### Resultado da fase

Ao final desta fase:

> O organizador consegue criar um evento e acessar o espaço onde o mapa será construído.

---

# Fase 2 — Mapeamento do ambiente

**Objetivo:** permitir que o organizador percorra fisicamente o local e transforme seus trajetos em dados.

### Sprint 3 — Exibição do mapa

* [ ] Integrar `react-native-maps` ao Expo.
* [ ] Criar componente `EventMap`.
* [ ] Renderizar marcadores.
* [ ] Renderizar linhas/polilinhas.
* [ ] Definir sistema de coordenadas.

### Sprint 4 — Gravação GPS

* [ ] Solicitar permissão de localização (`expo-location`).
* [ ] Obter posição atual.
* [ ] Iniciar tracking via `expo-location`.
* [ ] Registrar coordenadas.
* [ ] Exibir trajetória em tempo real.
* [ ] Pausar gravação.
* [ ] Retomar gravação.
* [ ] Finalizar gravação.
* [ ] Calcular distância aproximada.

### Sprint 5 — Persistência dos caminhos

Criar os modelos:

```text
Map
Path
```

* [ ] Criar mapa.
* [ ] Salvar caminhos.
* [ ] Buscar caminhos.
* [ ] Excluir caminhos.
* [ ] Renderizar caminhos salvos.

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
