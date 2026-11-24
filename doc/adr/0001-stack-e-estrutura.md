# 0001 — Stack e estrutura do Prumo

- **Data:** 2026-11-13
- **Status:** proposta, revisada em 2026-11-13 com o padrão já dividido em quatro arquivos
  (domínio em classes, `data/` com TanStack Query, `domain/` como pasta quando passa do gatilho)
- **Referências:** `doc/standards/PADRAO-DESENVOLVIMENTO.md` (entrada; cópia do projeto, de
  2026-11-13) e, nele, `PADRAO-NUCLEO.md`
  (§2 regras, §3.6 domínio, §5 níveis, §7 testes, §8 convenções, §10 checklists) e
  `PADRAO-FRONTEND.md` (§6 front-end, §7.6, §11.3 ilustração deste app, §12 app local).
  O `PADRAO-BACKEND.md` não foi copiado (não há servidor): as citações a §3.x e §4.x vêm dele.
  Também o protótipo `prumo.html` e o ADR 0007 do `client-web` (escolha de `pages` + `components`).
- **Divergências do padrão:** nenhuma. O Prumo aplica o §12 (app local) sobre o §6 (front-end)
  como estão escritos. O que este ADR acrescenta são as escolhas de produto e de tecnologia.

## Contexto

O Prumo é um app mobile único para pendências e finanças pessoais de **uma pessoa**: ciclos
semanais (Scrum pessoal), envelopes de orçamento, metas de curto e longo prazo e histórico.
O protótipo `prumo.html` já valida telas, fluxos e as regras de cálculo.

O que pesa na decisão:

- **Uso diário, muitas vezes sem internet** (no ônibus, no mercado). Registrar um gasto tem
  que ser instantâneo.
- **Dados financeiros pessoais.** Melhor que fiquem no aparelho até existir motivo para sair.
- **Lembretes de vencimento** precisam disparar no horário, com o app fechado.
- **Ambiente atual:** Windows, Node 24, pnpm 10, Biome, Vitest, Docker, Android SDK e adb
  (sem Mac, então sem build de iOS por enquanto).
- **Nível 1** do padrão (§5): um app, um `package.json`, estrutura só por pressão.

## Decisão

App web em **React + TypeScript** empacotado com **Capacitor** para Android, com **SQLite
local** como fonte de verdade. **Sem backend na v1.**

| Papel | Escolha | Por quê |
|---|---|---|
| Interface | React 19 + Vite | Mesma base do `client-web`; o protótipo já é HTML/CSS/JS e as funções puras migram quase sem mudança |
| Rotas | React Router (hash) | Aba ativa, filtros e ciclo vivem na URL (§6) |
| Consultas e ações | TanStack Query, com cada consulta escrita como hook | A mesma pendência aparece em quatro telas: com uma consulta compartilhada, concluir numa tela atualiza as outras (§6.6). E se um servidor de sincronização vier, as telas não mudam (§12.3) |
| Estilo | Tailwind 3.4 com tokens (`tokens.css` + `tailwind.config.ts`), tema claro e escuro | Mesmo desenho do `client-web` (ADR 0008 de lá). Os tokens de cor do protótipo viram os tokens do Tailwind. Escolhido em vez de CSS Modules pela consistência |
| Fontes | `@fontsource-variable` (Bricolage Grotesque, Inter) | Empacotadas, funcionam offline. O CDN do protótipo não serve num app offline |
| Casca nativa | Capacitor | Lembretes locais confiáveis e porta aberta para plugins Android; mantém uma base de código só |
| Dados | SQLite via `@capacitor-community/sqlite` | Nativo no Android; no navegador roda por sql.js direto, com o banco guardado no IndexedDB (o jeep-sqlite foi descartado em 2026-11-18, veja os pontos a verificar). Consultas por envelope e mês pedem SQL |
| Acesso a dados | SQL puro + migrações `.sql`, sem ORM, só em `data/` | Prisma não roda no aparelho; SQL puro basta nesse tamanho |
| Validação | Zod na borda do adaptador, em `data/` | Linhas do banco e o arquivo de backup importado são entrada não confiável (§4.2 do `BACKEND`, §12.3) |
| Domínio | Classes imutáveis, uma por conceito: com identidade e regra (`Task`, `Envelope`, `Goal`) e também para cálculo e exibição das telas (`Ledger`, `TaskList`). Mudou no ADR 0003 | Preferência registrada no §3.6. A classe recusa estado inválido no construtor e converte com `fromRecord` e `toRecord`; os recortes de uma lista devolvem outra lista e se encadeiam |
| Lembretes | `@capacitor/local-notifications` atrás de uma interface `Reminders` | Dependência externa, então interface + fake de teste |
| Testes | Vitest; Testing Library; SQLite real em memória com as mesmas migrações; Playwright para 3 a 5 fluxos | §7 e §7.6. Mock de banco não entra |
| Lint, tipos, pacotes | Biome, `tsc --noEmit` estrito, pnpm | Igual ao `client-web`; scripts `dev · build · check · lint · typecheck · test · e2e` |

**Regras de dados que o protótipo ainda não segue** (§12.4):

- **Dinheiro em centavos inteiros** (`amountInCents`). O protótipo usa decimais e soma com
  erro de ponto flutuante. Formatação em BRL só na camada visual. A classe `Money` (ler o que a
  pessoa digitou e mostrar em reais) nasceu na fatia 2, quando a tela de finanças precisou; as
  pendências têm a sua própria cópia, e ela sobe para `shared/` na terceira tela (§6.3).
- **Datas como texto `AAAA-MM-DD`** (data local, sem hora), e o **relógio entra por parâmetro**
  (`today`), com valor padrão (R3). É o que deixa "pode gastar hoje" testável.
- **Pendência com valor é um registro só** (`tasks` com valor, sentido e envelope opcionais),
  não duas tabelas.
- **Preparação barata para sincronizar depois:** ids gerados no aparelho, `updatedAt` em todo
  registro e apagar marcando `deletedAt`. Lançamentos são guardados e o saldo é derivado, em vez
  de gravar o saldo.

## Estrutura (forma esperada ao fim da v1)

Segue o §6 (front-end) e o §12 (app local) do `PADRAO-FRONTEND.md`; a ilustração deste app está
no §11.3 dele. Cada peça nasce na fatia indicada, não antes. Arquivo quando basta, pasta quando
precisa (§6.4); sem `index.ts` geral, só dentro de componente que virou pasta (§6.9).

A árvore completa, com a fatia em que cada peça nasce, está em `doc/standards/PADRAO-FRONTEND.md`, §11.3.
Ela fica lá, e só lá, para haver uma fonte só; este ADR guarda as decisões e os porquês.

**Onde cada regra do protótipo vai morar:**

| Função do protótipo | Destino |
|---|---|
| Situação do envelope (`envelopeStatus`) | classe `Envelope` em `shared/finance/domain/envelope.ts` |
| `everydayBudgetSnapshot` (o "pode gastar hoje") | classe `EverydayBudget` em `pages/money/domain/everyday-budget.ts`, com o relógio por parâmetro; a regra das três telas (§6.3) decide quando sobe para `shared/` |
| Totais do mês, saldo, lançamentos por dia | classe `Ledger` em `pages/money/domain/ledger.ts`, com filtros que se encadeiam |
| `isTaskOverdue`, concluir e reabrir | métodos da classe `Task` em `shared/tasks/domain/task.ts`; cada método que "muda" devolve outra instância |
| Ciclo semanal, ordenação por prazo e prioridade | classe `Cycle` em `shared/tasks/domain/cycle.ts` |
| Montar a linha de pendência (rótulo de prazo, tom, valor) | classe `TaskDisplay` em `pages/tasks/domain/task-display.ts`; vai para `components/task-row/` quando a linha aparecer em mais telas |
| `goalSnapshot`, `describeRequiredPace` | `pages/goals/domain/` (classe `Goal` e a regra do ritmo) |
| `buildMonthInsights`, `buildCycleInsights`, cronologia | `pages/history/domain/`, classes que derivam visões |
| Concluir tarefa com valor e lançar (e remover ao reabrir) | `shared/tasks/use-complete-task.ts`, porque quatro telas precisam dela; ao terminar, invalida as consultas afetadas |

Uma regra nasce na tela, a segunda tela copia e ela sobe para `shared/` na terceira (§6.3). A
exceção é uma peça criada para várias telas desde o começo. Os conceitos que o banco também
precisa (`Task`, `Cycle`, `Envelope`, `Transaction`) nascem direto em `shared/<área>/domain/`, porque
`data/` não pode importar de `pages/`. `iso-date`, `day-labels` e `Icon` também ficam em `shared/`
(ADR 0003). `use-complete-task` nasce em `shared/` na fatia 3.

### Por que cada escolha de estrutura é arquivo ou pasta

É o tipo de dúvida que o padrão quer evitar ("por que um é arquivo e outro é pasta?"), então fica
escrito (§6.4, §11.3):

| Peça | Forma | Por quê |
|---|---|---|
| `shared/finance/domain/` | **pasta** | tem dois conceitos que não se chamam (`Envelope` e `Transaction`), e com classes o natural é uma por arquivo; passou do gatilho do §3.6 |
| `shared/tasks/domain/` | **pasta** | `Task` e `Cycle` são conceitos distintos, cada um com identidade e regra própria |
| `pages/tasks/domain/` e `pages/money/domain/` | **pasta** | com classes, uma por conceito e um arquivo por classe (ADR 0003), com `index.ts` como porta única |
| `pages/today/domain.ts` | **arquivo** | só regras de exibição da tela, de um conceito só; cabe em um arquivo até um gatilho dizer o contrário |
| `pages/goals/domain.ts` | **arquivo** | um conceito (`Goal`) e a regra do ritmo, que se chamam |
| `components/task-row/` | **pasta** | carrega regra de exibição própria (`domain.ts`) e aparece em quatro telas |
| `components/button.tsx` | **arquivo** | só visual |
| `data/tasks.ts` | **arquivo** | interface, adaptador SQLite e fake de um recurso cabem juntos; vira pasta se o arquivo passar de ~300 linhas |

### As seis perguntas do §4.4 (`BACKEND`), respondidas

(1) o cálculo puro é o `domain`; (2) quem aciona é a pessoa e o horário (lembretes): a página e um
adaptador de lembretes; (3) dependências são banco, relógio, lembretes e arquivo de backup, quatro
adaptadores em `infra/`; (4) nenhum dado tem prazo de validade por enquanto; (5) concluir tarefa
com valor mexe em pendência e finanças, e isso mora em `shared/`; (6) sem rede, banco ou relógio
escondidos.

## Ordem de construção

| Fatia | Entrega | Teste que prova |
|---|---|---|
| 0. Fundação | Checklist §10.1 + Capacitor rodando "olá" no emulador ou aparelho + CI | Um teste real passando; o app abre no Android |
| 1. Pendências | `pages/tasks` + `data/tasks`: criar, mudar etapa, ciclo e backlog; classe `Task` | Teste da classe (construtor recusa estado inválido, métodos devolvem nova instância); `model.test.ts` com o fake de `data/` nos quatro estados; teste do adaptador com SQLite em memória |
| 2. Finanças | `pages/money` + `data/transactions`: envelopes, lançamentos, "pode gastar hoje"; classe `Envelope` | Casos de borda do valor diário (fim do mês, envelope estourado) |
| 3. Concluir com valor | `shared/tasks/use-complete-task.ts`: lança no envelope; reabrir remove; `Task` e `Cycle` sobem para `shared/` | Fluxo feliz + reabrir remove o lançamento + a outra tela atualiza |
| 4. Hoje | `pages/today`: o valor diário e as pendências em foco | Estados `loading`, `error` e `ready` do model |
| 5. Metas | `pages/goals`: aportes e ritmo necessário | Ritmo semanal e mensal; aporte atualiza a meta do mês |
| 6. Histórico | `pages/history`: meses, ciclos, cronologia, revisão do ciclo | Insights com dados gravados |
| 7. Lembretes | Aviso de vencimento via notificação local | Fake de `Reminders`; teste manual no aparelho |
| 8. Backup | Exportar e importar arquivo | Importar arquivo inválido falha alto, com mensagem clara |

A fatia 0 inclui o build Android de ponta a ponta de propósito: é a maior incógnita do
ambiente e deve cair primeiro.

## Alternativas descartadas

- **Expo / React Native:** UI nativa melhor, mas troca a base web que já domino e o CSS do
  protótipo não aproveita. Reavaliar se o desempenho de listas longas incomodar.
- **Flutter** (como o Waterfly III) e **Kotlin nativo** (como o Tasks.org): segunda linguagem
  e nenhum reaproveitamento do protótipo nem do `client-web`.
- **PWA puro:** sem lembretes confiáveis com o app fechado. Continua como plano B para iOS.
- **Backend primeiro (Supabase ou API própria):** exige internet e conta para registrar um
  gasto, e põe dado financeiro na nuvem sem necessidade. Contradiz o uso offline.
- **Telas chamando o banco direto, sem `data/`:** mais curto no começo, mas espalha SQL pelas
  telas e impede trocar o adaptador se um servidor vier. O padrão pede a interface desde o
  primeiro recurso (§6.7).
- **Funções soltas em vez de classes no domínio:** é o estilo do `client-web` e funcionaria. Foi
  escolhida a classe por preferência de quem mantém, aceitando o custo dos métodos fixos de
  conversão (`fromRecord`, `toRecord`), registrado no §3.6.

## Consequências

- Funciona sem internet e sem conta. O custo é que **não há sincronização entre aparelhos
  na v1**; o backup por arquivo cobre perda de aparelho.
- **Gatilho para virar N2 (monorepo):** quando um servidor de sincronização opcional existir
  (Hono + Postgres, como no `client-web`), ele é o segundo artefato implantável. Nascem
  `apps/mobile`, `apps/api` e `packages/contracts`. Antes disso, nada de monorepo. Nesse
  momento as classes ganham o `fromContract` ao lado do `fromRecord` e **nenhuma tela muda**,
  só os adaptadores de `data/` (§12.3).
- **Adaptadores futuros**, cada um com as quatro perguntas do §4.2 do `BACKEND` (formato,
  confiança, frescor, falha): captura de notificações de banco (só Android, permissão sensível),
  importação de OFX ou CSV, Open Finance.
- Sem criptografia do banco na v1. O SQLCipher é suportado pelo plugin e entra quando houver
  backup em nuvem ou sincronização.
- iOS fica para quando houver Mac ou CI com macOS. A versão web instalável cobre o intervalo,
  com armazenamento mais frágil.
- Manter o ADR atualizado é parte da entrega: mudou estrutura ou camada, atualiza este arquivo
  ou cria um ADR novo na mesma entrega (§8.5).

## Pontos a verificar na fatia 0

- **Versão do JDK exigida pelo Capacitor — resolvido em 2026-11-16.** O Capacitor 8.6.2 gera um
  projeto Android que exige **Java 21** (`sourceCompatibility` 21); o JDK 17 não serve. Usado o
  Temurin 21.0.13, em `C:\Dev\jdk21`. O `cap doctor` aprova e o APK de depuração foi gerado e
  aberto num aparelho Android.
- **`node:sqlite` — resolvido em 2026-11-18.** Funciona no Node 24.22 e roda os testes de banco em memória. Antes era dúvida: **release candidate** (estabilidade 1.2) no Node 24.15 ou superior. Fica só
  no adaptador de teste; plano B é o `better-sqlite3`, trocando um arquivo.
- **Persistência na web — resolvido em 2026-11-18.** O jeep-sqlite foi descartado: ele embute uma cópia
  própria do sql.js e exige um `.wasm` exatamente da mesma versão, que não foi possível descobrir (o app
  travava ao abrir o banco). No navegador, `infra/web-database.ts` usa o sql.js direto, com código e `.wasm`
  do mesmo pacote e o banco inteiro no IndexedDB. Serve para desenvolver e como plano B, não como versão
  principal; o Android usa o plugin nativo.
