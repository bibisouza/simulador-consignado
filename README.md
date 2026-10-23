# Simulador de empréstimo consignado

MVP de um simulador de consignado que consulta bancos fictícios **em paralelo** e mostra, em tempo real, o resultado de cada um (aprovado, reprovado ou indisponível).

Desenvolvido como desafio técnico para a vaga de estágio em desenvolvimento da Octafin. **Todos os dados e bancos são fictícios.** Os resultados não representam oferta de crédito.

- **Stack:** TypeScript, Next.js (App Router), Zod, Vitest
- **Autora:** Beatriz Silva Souza Bezerra

---

## Como executar

Pré-requisitos: **Node.js 20.19+ ou 22.12+** e npm.

```bash
git clone https://github.com/bibisouza/simulador-consignado.git
cd simulador-consignado
npm install
npm run dev
```

Abra http://localhost:3000.

Outros comandos:

```bash
npm test            # testes automatizados (Vitest)
npm run typecheck   # checagem de tipos (tsc --noEmit)
```

### Para testar na interface

Dados válidos (todos fictícios):

| Campo | Valor |
|---|---|
| CPF | `529.982.247-25` |
| CNPJ do empregador | `11.222.333/0001-81` |
| Salário | `5000` |
| Valor desejado | `10000` |
| Prazo | `24 meses` |

Cenários úteis:

- **Salário baixo** (ex.: `1000` com valor `20000`): geram reprovações e, no Banco Aurora, uma **contraproposta** com valor menor.
- **Repetir a simulação várias vezes:** o Banco Cedro falha de propósito em cerca de 30% das chamadas (trava, erro 503 ou resposta malformada), então em algum momento ele aparece como **Indisponível**.

### Para testar a API direto

```bash
curl -X POST http://localhost:3000/api/simulations \
  -H "Content-Type: application/json" \
  -d '{"name":"Beatriz Souza","email":"bia@exemplo.com","cpf":"52998224725","birthDate":"2000-05-10","salary":5000,"employerCnpj":"11222333000181","requestedAmount":10000,"termMonths":24}'
```

---

## O que a aplicação faz

1. O cliente preenche nome, e-mail, CPF, data de nascimento, salário, CNPJ do empregador, valor desejado, prazo e (opcionalmente) matrícula.
2. Os dados são validados no navegador e **de novo no servidor**.
3. O servidor consulta todos os bancos ao mesmo tempo. Cada banco responde num formato diferente.
4. Cada resposta é validada, convertida para um formato padrão e enviada à tela **assim que chega**.
5. Ao final, a tela mostra o resumo e destaca a oferta com menor taxa.

### Endpoints

| Rota | Uso |
|---|---|
| `POST /api/simulations/stream` | Usada pela tela. Devolve um evento JSON por linha (NDJSON): `started`, um `bank` por banco e `done`. |
| `POST /api/simulations` | Versão tradicional: espera todos os bancos e devolve o resultado completo em uma resposta. Útil para testes e para clientes sem streaming. |

Ambas chamam o **mesmo** `runSimulation`. A regra de negócio existe uma vez só, e as rotas são apenas formas de entregar o resultado.

---

## Arquitetura

```
src/
├── domain/      Tipos e schemas (Zod): entrada do cliente, resultado padronizado de banco, eventos de stream
├── banks/       Contrato BankProvider, um adapter por banco e as APIs fictícias (fakes/)
├── services/    Orquestrador (runSimulation): paralelismo, timeout, retry, isolamento de falhas
├── lib/         Utilitários puros: CPF/CNPJ, finanças, logger, leitor NDJSON, formatação
├── components/  Formulário e cards de resultado (React)
└── app/         Página e rotas da API (Next.js)
```

Fluxo de uma simulação:

```
Formulário ──► rota /stream ──► validação (Zod) ──► runSimulation
                                                      │
                          ┌───────────────────────────┼───────────────────────────┐
                          ▼                           ▼                           ▼
                   Adapter Aurora              Adapter Boreal              Adapter Cedro
                  (API fictícia A)            (API fictícia B)            (API fictícia C)
                          └──────────── BankResult padronizado ───────────────────┘
                                                      │
                                   evento "bank" enviado à tela a cada resposta
```

### Decisões técnicas

- **Adapter por banco.** Cada banco implementa a interface `BankProvider` e traduz o dialeto dele (taxa em percentual, taxa como texto `"2,10%"`, aprovação aninhada, códigos de rejeição) para um `BankResult` único. Adicionar um banco novo é criar um adapter e registrá-lo em `banks/index.ts`, sem mexer no resto.
- **`BankResult` é uma união discriminada** com três estados: `approved`, `rejected` e `unavailable`. O TypeScript obriga a tela e o serviço a tratar os três.
- **Resposta de terceiro é entrada não confiável.** Toda resposta de banco passa por um schema Zod antes de ser usada.
- **Injeção de dependência nos adapters.** As fábricas (`createAuroraProvider(api)`) recebem a "API" por parâmetro, então os testes injetam respostas prontas, sem rede e sem depender de sorte.
- **Uma fonte de verdade para a validação.** O tipo `SimulationRequest` nasce do schema Zod (`z.infer`), e o **mesmo schema** valida no navegador (feedback imediato) e no servidor (segurança).
- **CPF e CNPJ com dígito verificador.** O validador de CNPJ aceita também o formato alfanumérico (em vigor desde 31 de julho de 2026).
- **NDJSON sobre `fetch` para o streaming**, em vez de SSE: o `EventSource` só aceita GET, e a simulação é um POST com dados pessoais, que não devem ir na URL.
- **Rotas finas.** Validam a entrada, chamam o serviço e devolvem. A regra fica em `services/`.
- **Visual** inspirado na paleta e na tipografia da Octafin. As cores de estado (aprovado, reprovado, indisponível) são independentes da marca, porque carregam significado, e o ciano da marca é usado só como destaque, por causa do contraste com texto branco.

---

## Limitações

- **Bancos e regras são simulados.** A margem consignável de 35% usada pelos bancos fictícios é uma regra inventada para a demonstração, não uma regra oficial.
- **Sem persistência.** Nada é salvo: não há histórico nem banco de dados.
- **"Melhor oferta" é só a menor taxa mensal.** Não compara custo total quando os valores aprovados diferem (por exemplo, uma contraproposta com valor menor).
- **Proteção contra envio duplicado só no navegador** (botão desabilitado durante a consulta). O servidor não impede duas simulações iguais enviadas por outros meios.
- **Cancelamento não chega aos bancos.** Se o cliente fecha a aba, o servidor ainda termina as consultas em andamento.
- **Sem autenticação nem limite de requisições (rate limit).**
- **Streaming e proxies.** Alguns proxies e CDNs seguram a resposta antes de entregar, o que atrasaria os eventos. Não foi testado fora do ambiente local.
- **A tela confia no formato dos eventos do próprio servidor** (conversão de tipo sem validação). Como a API é nossa, é razoável num MVP, mas pode ser validado com Zod.
- **Testes cobrem o back-end e utilitários**, mas não há testes automatizados de interface.

---

## Espaço para propor

### Implementado

#### 1. Resultados em tempo real

- **Problema:** o cliente olhava uma tela parada até o banco mais lento responder (cerca de 6 s no pior caso), mesmo com ofertas prontas em menos de 1 s.
- **Proposta:** o servidor envia cada banco assim que ele responde (NDJSON), e a tela mostra "Consultando…" nos bancos que faltam, sempre na mesma ordem para não "pular".
- **Por quê:** o cliente vê a primeira oferta quase de imediato e percebe progresso. Um banco lento ou fora do ar não bloqueia a visualização dos outros.

#### 2. "Indisponível" é diferente de "Reprovado"

- **Problema:** se um banco cai e o sistema diz "reprovado", o cliente acredita que foi recusado e pode desistir de um crédito que teria sido aprovado.
- **Proposta:** `unavailable` é um estado próprio no tipo `BankResult`, com visual e texto próprios ("isso não é uma recusa: o banco não chegou a avaliar seu pedido") e um aviso para simular novamente. Respostas de banco desconhecidas ou malformadas também viram `unavailable`, nunca "reprovado".
- **Por quê:** evita que uma falha técnica do banco seja interpretada como decisão sobre o cliente. É uma garantia de negócio, não só de interface.

#### 3. Resiliência contra bancos que a empresa não controla

- **Problema:** a empresa depende de serviços de terceiros que travam, caem e respondem em formatos inesperados. Um banco ruim não pode derrubar a simulação inteira nem deixá-la esperando para sempre.
- **Proposta:** consulta em paralelo, timeout por tentativa (com cancelamento via `AbortSignal` e prazo garantido por `Promise.race`), retry limitado (2 tentativas) **apenas** para falhas passageiras (timeout e erro de rede), sem retry para resposta inválida. O orquestrador nunca rejeita: toda falha vira `unavailable`. Detalhes técnicos vão só para o log, não para o cliente.
- **Por quê:** a simulação tem tempo máximo previsível (cerca de 6 s no pior caso), falhas ficam isoladas por banco e o cliente nunca vê mensagens internas. O retry é seguro porque simular é uma operação de leitura.

#### 4. Privacidade nos logs (LGPD)

- **Problema:** logs costumam vazar dados pessoais sem que ninguém perceba, e CPF é dado sensível.
- **Proposta:** os logs são estruturados (JSON) e registram **apenas identificadores** (`simulationId`, `bankId`), status, tentativa e duração. O payload da requisição nunca é logado.
- **Por quê:** permite investigar problemas com um banco específico sem expor dados do cliente.

### Planejado (em ordem de prioridade)

1. **Propagar o cancelamento até os bancos** (`req.signal` → adapters). *Problema:* se o cliente fecha a aba, o servidor continua consultando e gastando chamadas. *Por quê primeiro:* é o ajuste mais barato, e a infraestrutura de `AbortSignal` já existe.
2. **Circuit breaker por banco.** *Problema:* se um banco está fora do ar, cada simulação ainda espera o timeout dele. *Proposta:* após falhas seguidas, marcar o banco como indisponível por um tempo e nem tentar. *Por quê:* a resposta fica mais rápida para o cliente e a empresa deixa de pressionar um serviço que já está com problema.
3. **Idempotência no servidor.** *Problema:* hoje só o botão impede envio duplicado. *Proposta:* chave de idempotência por simulação. *Por quê:* evita consultas repetidas e custo desnecessário com bancos.
4. **Rate limit por IP e por CPF.** *Problema:* o endpoint está aberto e permitiria enumerar CPFs ou sobrecarregar os bancos. *Por quê:* segurança e proteção da relação com os parceiros.
5. **Persistência e histórico das simulações**, com dados pessoais protegidos. *Por quê:* permite reabrir um resultado e dá base para métricas.
6. **Observabilidade por banco:** taxa de sucesso, tempo de resposta (p95) e causas de falha. *Por quê:* a empresa passa a ter dados concretos para cobrar ou renegociar com um parceiro instável.
7. **Comparação por custo total** (CET), não só pela taxa mensal. *Por quê:* a "melhor oferta" fica correta mesmo com valores aprovados diferentes.
8. **Processamento assíncrono com aviso ao cliente** (e-mail ou mensagem) quando um banco lento responder depois de a tela ser fechada.
9. **Autenticação** e testes automatizados de interface.

---

## Estrutura de testes

Os testes ficam ao lado do código que testam (`*.test.ts`) e cobrem: validação de CPF/CNPJ, cálculos financeiros, adaptação das respostas de cada banco (incluindo respostas malformadas), o orquestrador (paralelismo, timeout com cancelamento, retry, isolamento de falhas, mensagens sem detalhe técnico), o resumo de ofertas, as máscaras de formulário e o leitor de NDJSON (incluindo linhas partidas entre pedaços).
