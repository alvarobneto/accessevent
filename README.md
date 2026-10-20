# AccessEvent

Aplicativo para mapear e consultar informações de acessibilidade em eventos. O repositório é um monorepo npm com dois workspaces:

- `mobile/`: aplicativo Expo + React Native para iOS e Android.
- `backend/`: API REST NestJS e migrações do PostgreSQL.

O objetivo deste guia é levar de um clone novo a uma versão executando localmente. Para decisões de produto, consulte [`PRD.md`](PRD.md); para o planejamento, [`sprints.md`](sprints.md).

## Requisitos

- Node.js **24.x** e npm (o npm é instalado junto com o Node.js).
- Docker Desktop ou Docker Engine com o plugin `docker compose`, para executar o PostgreSQL e, opcionalmente, a API. Sem Docker, o app pode ser aberto usando os dados temporários em memória.
- Para compilar e abrir o app: Xcode e simulador iOS no macOS, ou Android Studio com Android SDK e um emulador/dispositivo Android.
- No Android, uma chave do Google Maps é necessária para exibir o mapa. O app ainda abre sem ela, mas informa que o mapa está indisponível. Veja `mobile/.env.example` para criar e restringir uma chave.

Confira as ferramentas antes de começar:

```bash
node --version
npm --version
docker compose version
```

## Primeira execução

Na raiz do repositório, instale as dependências dos dois workspaces:

```bash
npm install
```

Crie os arquivos locais de configuração copiando os exemplos. Esses arquivos não devem ser commitados:

```bash
cp .env.example .env
cp mobile/.env.example mobile/.env
```

No macOS/Linux, a sequência acima funciona diretamente. No Windows, copie os mesmos arquivos pelo Explorer ou use `Copy-Item .env.example .env` e `Copy-Item mobile/.env.example mobile/.env` no PowerShell.

### Opção recomendada: API e banco em Docker

Suba PostgreSQL, migrações e API com um comando:

```bash
npm run stack:up
```

O Compose constrói a API, aguarda o banco ficar pronto, aplica as migrações e inicia a API. Confira a saúde do serviço:

```bash
curl http://localhost:3333/health
```

Em outro terminal, compile/instale e abra o app em um simulador ou dispositivo seguindo [Executar o app mobile](#executar-o-app-mobile). Na primeira execução, use `npm run dev:ios` ou `npm run dev:android`; esses comandos também iniciam o Metro:

```bash
npm run dev:ios      # macOS com Xcode e simulador iOS
npm run dev:android  # Android Studio/SDK e emulador ou dispositivo configurado
```

O serviço Docker mantém o banco em um volume chamado `postgres-data`, então os dados continuam lá depois de parar os containers.

### Opção para desenvolver a API com hot reload

Use esta opção quando estiver trabalhando no código NestJS. O banco continua no Docker, mas a API roda pelo Node no host:

1. Copie `backend/.env.example` para `backend/.env`.
2. Inicie somente o banco: `npm run db:up`.
3. Em um terminal, rode `npm run dev:api`.
4. Em outro terminal, rode `npm run dev:mobile`.

O arquivo `backend/.env` já aponta para `localhost:5432`, que é a porta publicada pelo Compose. Não inicie ao mesmo tempo a API do Docker e a API local: ambas usam a porta `3333`.

## Executar o app mobile

O AccessEvent usa módulos nativos (mapas, câmera e localização), então **Expo Go não é compatível**. É necessário criar um development build local, que as tarefas `dev:ios` e `dev:android` fazem na primeira execução.

1. Ajuste `mobile/.env` se necessário:
   - iOS Simulator: `EXPO_PUBLIC_API_URL=http://localhost:3333`.
   - Emulador Android: `EXPO_PUBLIC_API_URL=http://10.0.2.2:3333`.
   - Celular físico: use o IP LAN do computador, por exemplo `http://192.168.1.20:3333`; computador e celular precisam estar na mesma rede.
2. Para executar sem API nem Docker, altere `EXPO_PUBLIC_DATA_SOURCE=memory`. Os dados desse modo são temporários e reiniciam ao reabrir o app.
3. Compile/instale e abra uma plataforma (o comando inicia também o Metro):

```bash
npm run dev:ios      # macOS com Xcode e simulador iOS
npm run dev:android  # Android Studio/SDK e emulador ou dispositivo configurado
```

Depois da primeira instalação, `npm run dev:mobile` inicia o Metro para desenvolver com o app já instalado; se trocar configurações `EXPO_PUBLIC_*`, use `npm run dev:mobile:clear` para recarregar variáveis e limpar o cache. A primeira compilação pode levar alguns minutos. Para testar localização e câmera, permita o acesso quando o sistema solicitar; emuladores podem não reproduzir todo o comportamento de um aparelho físico.

O `.env` da raiz é lido pelo Docker Compose; `backend/.env` é usado quando a API roda no host; `mobile/.env` fornece configurações `EXPO_PUBLIC_*` ao Expo. São arquivos independentes. Para configurar a chave do Google Maps no Android, siga o passo a passo comentado em `mobile/.env.example`; depois de alterar a chave é necessário gerar novamente o build nativo.

## Comandos da raiz

Execute todos a partir da raiz do repositório:

- `npm install`: instala as dependências de `backend/` e `mobile/`.
- `npm run dev:api`: inicia a API em modo watch (requer PostgreSQL ativo).
- `npm run dev:mobile`: inicia o Metro/Expo.
- `npm run dev:mobile:clear`: reinicia o Expo limpando o cache.
- `npm run dev:ios` / `npm run dev:android`: compila e abre o app na plataforma correspondente.
- `npm run db:up` / `npm run db:down`: inicia ou para somente o PostgreSQL.
- `npm run stack:up` / `npm run stack:down`: inicia a stack Docker completa ou para seus containers. Os dados do banco são preservados.
- `npm run api:build`: compila a API.
- `npm run lint`, `npm run typecheck` e `npm test`: executam as checagens/testes nos workspaces.
- `npm run test:e2e`: executa os testes e2e do backend.
- `npm run doctor`: executa o diagnóstico do Expo.
- `npm run check`: executa lint, typecheck e testes unitários nos dois apps.

Para parar os containers sem remover dados, use `npm run stack:down`. O comando `docker compose down -v` remove também o volume e **apaga os dados locais do PostgreSQL**.

## Executar só a API

A API pode rodar no Docker com o banco (`npm run stack:up`) ou localmente com o banco em Docker (instruções acima). Os principais endpoints são:

- `GET http://localhost:3333/health`: estado da API e conexão com o banco.
- `GET http://localhost:3333/events`: consulta eventos.

As migrações são aplicadas automaticamente no fluxo Docker. Em execução local, aplique-as quando necessário com `npm run migration:run --workspace=accessevent-api`.

Para os scripts de desenvolvimento, testes e detalhes do contrato HTTP, consulte [`backend/README.md`](backend/README.md).

## Solução de problemas

- **A API não inicia:** confirme que o banco está pronto (`docker compose ps`) e que a porta `3333` não está sendo usada por outro processo. Com a API local, confira as variáveis em `backend/.env`.
- **O app não conecta à API no Android:** `localhost` dentro do emulador aponta para o próprio emulador. Use `10.0.2.2`; em aparelho físico, use o IP LAN do computador e permita a conexão na rede/firewall.
- **Mapa indisponível no Android:** configure `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` no `mobile/.env` e gere um novo build (`npm run dev:android`).
- **O Expo ainda usa uma configuração antiga:** pare o processo e rode `npm run dev:mobile:clear`.
- **Porta do PostgreSQL já ocupada:** altere `DATABASE_PORT` no `.env` da raiz antes de subir o Compose.
- **Diagnóstico do ambiente Expo:** rode `npm run doctor`. No estado atual do projeto, o Expo Doctor aponta duas pendências preexistentes: `android.usesCleartextTraffic` no schema do `app.json` e versões patch do SDK 57 abaixo das recomendadas pela versão instalada do Expo. O plugin `expo-build-properties` configura o tráfego HTTP no manifesto nativo; não remova essa configuração ao tratar o aviso. Atualize versões nativas somente conferindo a compatibilidade do app.

## Estrutura

```text
.
├── backend/          # NestJS, TypeORM, migrações e testes da API
├── mobile/           # Expo Router, React Native e app iOS/Android
├── docker-compose.yml
├── PRD.md            # requisitos e decisões de produto
├── sprints.md        # plano e histórico de implementação
└── package.json      # workspaces e comandos compartilhados
```
