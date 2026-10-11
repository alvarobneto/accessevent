# 💰 Monetização do AccessEvent — Aula Completa

> [!IMPORTANT]
> Este documento analisa o AccessEvent especificamente: um app B2B onde o **organizador de eventos** é o cliente pagante, e o **participante** (PcD) é o usuário final gratuito. Isso muda tudo na estratégia.

---

## 1. Conceito fundamental: quem paga?

Antes de escolher o modelo, você precisa responder: **quem tem a dor maior?**

| Persona | Dor | Disposição para pagar |
|---|---|---|
| **Organizador** | Não tem mapa de acessibilidade, pode ser penalizado, quer parecer inclusivo | **Alta** — é uma necessidade profissional/legal |
| **Participante (PcD)** | Precisa se locomover no evento | **Baixa/Nula** — nunca cobre usuários vulneráveis |

**Conclusão:** O seu modelo de negócio é **B2B** (Business to Business). O organizador paga, o participante nunca paga. Isso é padrão em produtos de acessibilidade — pense no como o Waze é gratuito para usuários mas cobra das prefeituras.

---

## 2. Os grandes modelos de monetização (teoria)

### 2.1 Assinatura (SaaS — Software as a Service)
O cliente paga um valor recorrente (mensal ou anual) para usar o produto.

- **Exemplos:** Spotify, Netflix, Notion, GitHub Pro
- **Vantagem:** Receita previsível, relação de longo prazo com o cliente
- **Desvantagem:** Precisa entregar valor contínuo para justificar a renovação

### 2.2 Por uso / Pay-per-event
O cliente paga por unidade de consumo (por evento, por mapa criado, por QR code gerado).

- **Exemplos:** AWS (por GB), Stripe (por transação), Twilio (por SMS)
- **Vantagem:** Baixa barreira de entrada — o cliente só paga quando usa
- **Desvantagem:** Receita imprevisível; cliente pode sumir entre eventos

### 2.3 Freemium
Produto gratuito com limitações; funcionalidades premium são pagas.

- **Exemplos:** Notion (plano grátis limitado), Figma, Canva
- **Vantagem:** Crescimento viral, menor resistência inicial
- **Desvantagem:** Conversão baixa (tipicamente 2–5% dos usuários free pagam)

### 2.4 Licença / Enterprise
Contrato anual fechado diretamente com grandes clientes (empresas, prefeituras, centros de convenções).

- **Exemplos:** Salesforce, SAP, Jira (plano Data Center)
- **Vantagem:** Ticket alto, contratos de longo prazo
- **Desvantagem:** Ciclo de venda longo, exige equipe comercial

### 2.5 Marketplace / Comissão
Você cobra uma porcentagem de cada transação intermediada.

- **Exemplos:** Airbnb, iFood, App Store
- **Vantagem:** Escala naturalmente com o volume
- **Desvantagem:** Exige volume alto para gerar receita relevante

---

## 3. Qual modelo faz sentido para o AccessEvent?

Dado que:
- O organizador cria eventos **esporádicos** (um festival, uma conferência, um show)
- Alguns organizadores são **pessoas físicas** (pequenos eventos), outros são **empresas** (grandes feiras)
- O app precisa de tração inicial (poucos usuários no começo)
- Acessibilidade tem **apelo regulatório** (a Lei Brasileira de Inclusão, LBI/2015, exige acessibilidade em eventos públicos)

### Recomendação: Freemium + Pay-per-event + Enterprise

Estruture em **3 camadas**:

---

## 4. Proposta de modelo em 3 camadas

### Camada 1 — Free (Isca)
**Para:** Organizadores pequenos, estudantes, eventos sem fins lucrativos

| O que inclui | Limite |
|---|---|
| Criação de eventos | 1 evento ativo |
| Caminhos gravados | Até 10 por mapa |
| Participantes simultâneos | Sem limite |
| QR Codes | 3 por mapa |
| Suporte | Apenas documentação |

**Objetivo:** Fazer o produto entrar em eventos reais, gerar casos de uso e provas sociais ("o Festival X usou o AccessEvent").

---

### Camada 2 — Pro (Pay-per-event ou Assinatura)
**Para:** Organizadores profissionais, agências de eventos, empresas

**Opção A — Por evento (recomendada para o início):**
| Porte do evento | Preço sugerido |
|---|---|
| Até 500 participantes | R$ 149 / evento |
| Até 2.000 participantes | R$ 349 / evento |
| Até 10.000 participantes | R$ 799 / evento |

**Opção B — Assinatura mensal:**
| Plano | Preço | Eventos simultâneos |
|---|---|---|
| Starter | R$ 99/mês | 2 eventos |
| Pro | R$ 249/mês | 10 eventos |
| Unlimited | R$ 599/mês | Ilimitado |

O que desbloqueia no Pro:
- Caminhos e QR Codes ilimitados
- Histórico de mapas reutilizáveis
- Analytics: quantas rotas foram calculadas, quais pontos foram mais acessados
- Exportação de relatório de acessibilidade (PDF) — útil para compliance legal
- Suporte por e-mail

---

### Camada 3 — Enterprise (Contrato)
**Para:** Centros de convenções, prefeituras, universidades, shoppings

- Contrato anual (ex.: R$ 12.000–60.000/ano)
- White-label (o app aparece com a marca do cliente)
- SLA de suporte garantido
- Integração com sistemas internos (ex.: sistema de ingressos)
- Treinamento da equipe
- Múltiplos usuários organizadores por conta

---

## 5. Por que não cobrar do participante?

Além do aspecto ético (não cobrar de pessoas com deficiência para ter acessibilidade), há um motivo de negócio: **o participante é o ativo que gera valor para o organizador pagar**.

Se o participante precisar pagar ou baixar um app obscuro, ele não usa. Se ele não usa, o organizador não vê valor. Se o organizador não vê valor, ele não paga.

Esse modelo — onde um lado da plataforma é sempre gratuito — é chamado de **two-sided market** (mercado de dois lados). Exemplos clássicos: cartão de crédito (lojista paga, consumidor usa grátis), Google (usuário grátis, anunciante paga).

---

## 6. Alavancas de crescimento (como chegar até o cliente pagante)

### 6.1 Compliance como alavanca
A **Lei Brasileira de Inclusão (Lei 13.146/2015)** obriga que eventos públicos sejam acessíveis. Muitos organizadores não sabem como cumprir isso. O AccessEvent resolve isso de forma documentada (o relatório PDF do plano Pro serve como evidência de conformidade).

**Mensagem de venda:** "Prove que seu evento é acessível — com relatório incluído."

### 6.2 Casos de uso reais como prova social
Um evento famoso usando o app vale mais que qualquer anúncio. Ofereça **grátis para os primeiros 10 eventos grandes** em troca de divulgação e depoimento.

### 6.3 Parcerias com plataformas de eventos
Sympla, Eventbrite, Ticket360 — integrar ou aparecer como "add-on de acessibilidade" nessas plataformas pode trazer volume de clientes sem custo de aquisição.

### 6.4 B2G (Business to Government)
Prefeituras organizam dezenas de eventos por ano. Um contrato municipal pode garantir receita recorrente previsível.

---

## 7. Métricas que você vai precisar acompanhar

| Métrica | O que mede | Meta inicial |
|---|---|---|
| **MRR** (Monthly Recurring Revenue) | Receita recorrente mensal | Crescimento mês a mês |
| **Churn** | % de clientes que cancelam por mês | < 5% ao mês |
| **CAC** (Custo de Aquisição de Cliente) | Quanto custa trazer 1 cliente | < LTV/3 |
| **LTV** (Lifetime Value) | Quanto um cliente gasta no total | > 3x CAC |
| **Conversão free → pago** | % de usuários free que pagam | > 5% |
| **NPS** | Satisfação dos clientes | > 50 |

---

## 8. Resumo visual da estratégia recomendada

```
Fase 1 — Tração (MVP / agora)
  └── 100% gratuito, sem cobrar nada
  └── Objetivo: ter 20+ eventos reais usando o app
  └── Coletar feedbacks, melhorar o produto

Fase 2 — Monetização inicial (pós-MVP)
  └── Lançar plano Pay-per-event (R$149–799)
  └── Free continua existindo (1 evento, limitado)
  └── Objetivo: primeiros R$ 5.000 em MRR

Fase 3 — Escala (6–18 meses)
  └── Lançar assinatura mensal
  └── Construir pipeline Enterprise
  └── Parcerias com plataformas de eventos
  └── Objetivo: R$ 30.000+ em MRR
```

---

## 9. Referências de mercado

- **AccessNow** (mapa de acessibilidade global) — modelo gratuito + doações + B2G
- **Seatmap** / **VenueOps** — SaaS para gestão de locais de eventos, cobram por assinatura
- **Wheel the World** (turismo acessível) — cobra comissão como marketplace
- **Mapability** — B2B para shoppings e aeroportos, contratos enterprise

O AccessEvent tem um diferencial claro sobre todos eles: **o mapeamento é feito pelo próprio organizador, sem custo de campo**. Isso é um barreiro de entrada baixíssimo para o cliente — ele mesmo cria o mapa caminhando com o celular.

---

> [!TIP]
> **Próximos passos práticos:** Não implemente nada de pagamento agora — o foco é o MVP. Mas já documente no PRD qual será o modelo, para que as decisões técnicas futuras (multi-tenancy, relatórios, analytics) sejam construídas na direção certa.
