# Padrão de Desenvolvimento — Front-end

> Cópia do projeto (2026-11-13): vale esta, não `C:\Dev`. O §11.3 é específico do Prumo (a árvore exata).

> Como se organiza uma tela e tudo o que ela usa: páginas, componentes, regra (`domain`), dados
> (`data/`), estado, tipos. Vale para app com API e para app local, sem servidor (§12). Leia junto
> com `PADRAO-NUCLEO.md` (regras, domínio, níveis, testes, convenções). Mapa de seções:
> `README.md`.

---

## 6. Frontend

Mesma lógica do back-end: a tela é a **porta**, e a porta é fina. Esta seção vale para o front-end
de qualquer app, com API ou sem servidor (web ou mobile): a tela depende de uma **interface de
dados** e não sabe se do outro lado há HTTP ou um banco local (§6.7). Por isso existe um desenho
só, e não um para cada caso.

### 6.1 O princípio: layout e regra são arquivos diferentes, lado a lado

Quem desenha e quem decide são coisas diferentes, e o código mostra isso:

```
página (layout) ──► componentes
      │
      └─► model (hook) ──► domain (regra pura)
              │
              └─► data/ (interface de dados: HTTP, banco local ou fake)
```

- O **layout** (`*-page.tsx`, componentes) só desenha o que recebe e emite eventos.
- O **model** (hook) liga a tela aos dados e devolve um **estado** (R4), nunca markup.
- O **domain** guarda a regra pura, sem React (§3.6).

> **Por quê.** O layout muda por gosto e por redesenho; a regra muda por decisão de negócio.
> Separá-los deixa trocar um sem tocar no outro, e deixa testar a regra sem renderizar nada.

Não existe um padrão de frontend à parte: as 7 regras (§2) valem inteiras, com outros nomes:

| Regra | Como aparece na interface |
|---|---|
| R1 regra pura no meio | derivar, ordenar e formatar são funções ou classes puras em `domain`; o efeito fica no hook ou no componente |
| R2 dependência por parâmetro | o model recebe a interface de dados e o relógio; o componente recebe por propriedade |
| R3 tempo e aleatório | `now`/`uuid` injetados, senão o teste fica instável |
| R4 devolve dado | o model devolve **estado**, nunca markup |
| R5 erro tipado | estado de erro nomeado, traduzido em texto só na camada visual |
| R6 nada ao importar | store de módulo que busca dados no import é o erro clássico |
| R7 dependência para dentro | o componente conhece o model e o domain; o model não conhece componente |

### 6.2 Pastas

```
src/
├─ main.tsx                  único ponto que liga o mundo real (R6)
├─ app.tsx                   rotas
├─ styles/                   tokens e estilos globais
│
├─ components/               componentes usados por várias telas
│  ├─ button.tsx             só visual: um arquivo
│  └─ task-row/              tem regra própria: vira pasta
│     ├─ task-row.tsx        layout
│     ├─ domain.ts           regra pura (toTaskRowView)
│     ├─ use-task-row.ts     hook, só se precisar de contexto
│     └─ index.ts            exporta o componente e, se fizer sentido, o hook
│
├─ pages/                    uma pasta por rota
│  └─ today/
│     ├─ today-page.tsx      layout da tela
│     ├─ model.ts            hook da tela: lê e grava, devolve estado
│     ├─ domain.ts           regra pura da tela
│     ├─ components/         componentes que só esta tela usa
│     └─ model.test.ts · domain.test.ts
│
├─ shared/                   regra ou utilitário de duas ou mais telas, sem ser visual
├─ data/                     interface de dados + adaptadores, por recurso
└─ infra/                    capacidades técnicas: cliente HTTP, relógio, notificações, arquivo
```

| Pasta | O que é | Por que existe |
|---|---|---|
| `main.tsx` | o único arquivo que cria o mundo real (cliente HTTP ou banco, relógio) e o entrega às telas | R6: sem isso, todo teste arrasta a infraestrutura |
| `app.tsx` | as rotas | separado do `main.tsx` para poder renderizar o app em teste sem ligar o mundo real |
| `pages/<rota>/` | uma pasta por rota, com layout, model, domain e componentes próprios | achar uma tela é achar a rota; apagar a tela é apagar a pasta |
| `components/` | componentes de várias telas | um lugar só para o que se repete, sem cada tela ter a sua cópia |
| `shared/` | regra ou utilitário de duas ou mais telas, sem ser visual | onde a regra vai quando a segunda tela precisa dela |
| `data/` | a interface de dados e os adaptadores, por recurso (`tasks`, `transactions`) | a tela não conhece HTTP nem SQL (§6.7) |
| `infra/` | capacidades técnicas: cliente HTTP, conexão com o banco, relógio, notificações, arquivo | diferença para `data/`: `infra/` é a ferramenta, `data/` é o recurso do negócio |

> **Por que `pages` e não `features`.** Escolha de quem mantém (ADR 0007 do `client-web`): `pages` e
> `components` são o que se espera de um projeto React. O nome é só vocabulário; o que importa é o
> corte entre layout e regra.

> **Por que o adaptador mora em `data/` e não dentro de cada tela.** Um recurso (as pendências)
> aparece em várias telas, e o adaptador não pertence a nenhuma delas.

### 6.3 Escopo: do local ao compartilhado

Cada peça nasce no escopo mais estreito que a atende e **sobe** quando outro lugar precisar dela.

| Peça | Só uma tela usa | Uma segunda tela passa a usar | Três ou mais |
|---|---|---|---|
| Componente | `pages/x/components/` | a segunda tela **copia**; cada uma fica com a sua | sobe para `components/` |
| Regra pura | `pages/x/domain.ts` | idem: copia | sobe para `shared/` |
| Classe de domínio | `pages/x/domain/` | idem: copia | sobe para `shared/` |

A regra de três é a do §8.3 (duplique na 2ª ocorrência, extraia na 3ª), e a mesma razão vale
aqui: antes da terceira ocorrência ainda não se sabe qual é a forma certa de compartilhar.

**Exceção:** uma peça criada **para várias telas desde o começo** (como `use-complete-task`) nasce
direto em `shared/` e leva consigo as classes e regras de que depende, porque um hook ou componente
compartilhado não pode importar de `pages/` (regra abaixo e §6.9).

**Regra de importação:** uma página **nunca** importa de dentro de outra página. Se precisar,
a peça sobe.

**Componente com regra geral.** A linha de pendência aparece em quatro telas e carrega ideias
como "atrasada". Ela vira uma **pasta** em `components/`, com o layout e a regra juntos
(`task-row/`): a regra de exibição em `domain.ts` e, se precisar de contexto, um hook
`use-task-row.ts`. O hook pode ser exportado **sozinho**, para outra tela usar a regra com outro
visual.

### 6.4 Arquivo ou pasta: o gatilho

O padrão não escolhe a forma de antemão. Cada coisa começa como **arquivo** e vira **pasta** por
um gatilho que dá para verificar. Ao ver um arquivo e uma pasta lado a lado, o motivo de cada um
deve estar nesta tabela.

| Elemento | É arquivo quando... | Vira pasta quando... | Exemplo |
|---|---|---|---|
| Componente | só visual | ganha `domain.ts` ou `use-*.ts` | `button.tsx` (arquivo); `task-row/` (pasta, tem regra) |
| `domain` | até ~300 linhas e as regras tratam de um conceito (§3.6) | passou de ~300 linhas ou tem dois grupos que não se chamam | `domain.ts` de uma tela simples; `domain/` de um módulo com `task.ts` e `cycle.ts` |
| `components/` de uma tela | nunca é arquivo: é pasta desde o primeiro componente local | | `pages/today/components/` |
| Hook da tela | sempre `model.ts` (não vira pasta) | quando o model passa de ~150 linhas ou tem hooks que podem servir a outra tela, os hooks auxiliares saem para arquivos `use-*.ts` **ao lado**; se outra tela os usar, sobem para `shared/` | `model.ts` + `use-complete-task.ts` |
| Tela | tela estática (uma explicação, uma política) é um arquivo só | tem estado ou regra: página + model (+ domain) | `forgot-password-page.tsx`; `pages/today/` |

Só ter **um teste ao lado** não exige pasta (`button.tsx` + `button.test.tsx`).

> **Por quê.** É a primeira regra do padrão (§1) aplicada às pastas: estrutura se adiciona por
> pressão, nunca por antecipação. Uma pasta com um único arquivo dentro é verbosidade, e um
> arquivo que concentra três conceitos é dívida. O gatilho evita as duas.

### 6.5 Papel e nome de cada arquivo

| Arquivo | O que é | React? |
|---|---|---|
| `*-page.tsx`, `nome.tsx` | layout: só desenha o que recebe | sim |
| `domain.ts` ou `domain/` | regra pura; não importa React nem nada do projeto | não |
| `model.ts`, `use-*.ts` | hook: a cola entre a regra e o React (estado, efeito, contexto, serviços), só quando precisar | sim |
| `data/<recurso>.ts` | interface de dados + adaptadores + fake (§6.7) | não |
| `infra/*.ts` | capacidade técnica atrás de uma interface | não |

**Função pura primeiro, hook depois.** O que é só cálculo fica em `domain`. O hook entra quando
há estado, efeito, contexto ou serviço.

> **Por quê.** Hook não é regra, é cola com o React. Uma regra como "o que é atrasada" escrita
> como hook perde duas coisas: o teste, que passa a exigir `renderHook`, e o uso fora do React
> (o agendamento de lembretes roda fora da tela e precisa da mesma regra). Como função pura, a
> regra testa sozinha e roda em qualquer lugar; o hook só entrega a ela o que vem do contexto,
> como o "hoje" do relógio.

### 6.6 O model: consultas como hooks e estado da tela

**Cada tela devolve um estado nomeado**, e a página só escolhe o que desenhar. Use uma união
discriminada, não vários booleanos:

```ts
// model.ts
export type TodayState =
  | { status: "loading" }
  | { status: "error"; reason: "data-unavailable" }
  | { status: "ready"; allowance: AllowanceView; focusTasks: TaskRowView[] };
```

```tsx
// today-page.tsx: layout, sem regra
export function TodayPage() {
  const today = useToday(useServices());
  if (today.status === "loading") return <ScreenSkeleton />;
  if (today.status === "error") return <ScreenError reason={today.reason} />;
  return <TodayScreen allowance={today.allowance} tasks={today.focusTasks} />;
}
```

> **Por quê.** `isLoading && !isError && data?.length` é onde nascem os bugs de tela. Com uma
> união, o compilador obriga a tratar cada estado, e o teste do model cobre os quatro (carregando,
> vazio, erro, sucesso) sem renderizar a tela.

**Consultas e ações são hooks, com React Query**, em qualquer tipo de app:

```ts
export function useToday({ tasks, finance, clock }: TodayDeps): TodayState {
  const taskList = useQuery({ queryKey: tasksKeys.all, queryFn: tasks.list });
  const budget = useQuery({ queryKey: financeKeys.budget, queryFn: finance.currentBudget });
  if (taskList.isPending || budget.isPending) return { status: "loading" };
  if (taskList.isError || budget.isError) return { status: "error", reason: "data-unavailable" };
  const today = clock.today();
  return {
    status: "ready",
    allowance: toAllowanceView(budget.data, today),
    focusTasks: taskList.data.filter((task) => task.isOverdue(today)).map((task) => toTaskRowView(task, today)),
  };
}

export function useCompleteTask({ tasks }: { tasks: TasksData }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => tasks.save(task.complete()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
  });
}
```

**Onde moram as chaves de consulta.** `tasksKeys` e as demais ficam em `data/<recurso>.ts`, ao lado da
interface: quem lê (o model) e quem invalida (a ação) precisam da mesma chave, e esse é o único
arquivo que os dois já conhecem.

> **Por que React Query também no app local.** Duas razões. (1) A mesma lista de pendências
> aparece em várias telas: concluir uma em "Hoje" precisa atualizar as outras, e é exatamente
> isso que `invalidateQueries` resolve, sem uma regra escrita à mão para duas telas que
> divergem. (2) Mesmo um banco local é assíncrono (o SQLite do Capacitor, por exemplo), então os
> estados de carregando e de erro existem de qualquer forma, e `useQuery` os entrega.

### 6.7 Dados e adaptadores: `data/`

A tela depende de uma **interface** no vocabulário do app. Quem a implementa pode ser HTTP, SQL
ou um fake de teste, e a tela não sabe qual.

```ts
// data/tasks.ts
export type TasksData = {
  list(): Promise<Task[]>;
  save(task: Task): Promise<void>;
};

export function createHttpTasksData(http: HttpClient): TasksData { /* axios + schema do contrato */ }
export function createSqliteTasksData(db: Database): TasksData { /* SQL + schema da linha */ }
export function createFakeTasksData(seed: Task[]): TasksData { /* memória, para teste */ }
```

Cada adaptador responde as quatro perguntas do §4.2. Na prática, no front: **formato** (a
resposta vira `Task`, via `fromContract` ou `fromRecord`), **confiança** (o dado de fora é
validado com schema na borda e falha alto ali), **frescor** (o React Query cuida do cache) e
**falha** (erro de rede ou de banco vira o estado `error` do model).

> **Por quê.** Se o app local ganhar sincronização um dia, ou se um app com servidor passar a ter
> modo offline, muda o adaptador em `data/`. Nenhuma página é tocada. É a mesma razão do §4.2:
> dependência externa é o único lugar onde a interface nasce por antecipação, porque ela sempre
> tem duas implementações, a real e a de teste.

### 6.8 Tipos

**O tipo mora ao lado de quem o produz.** O tipo do que uma regra devolve fica no arquivo dela, e
quem consome importa com `import type`.

| Tipo | Onde |
|---|---|
| Props do componente (`TaskRowProps`) | no arquivo do componente, sem exportar |
| Modelo de exibição (`TaskRowView`) | no `domain` que o produz |
| Estado da tela (`TodayState`), dependências do hook (`TodayDeps`) | no `model.ts` |
| Entidade e entrada (`TaskDto`, `CreateTaskInput`) | no contrato (§3.5); no app local, na classe e no schema de `data/` |
| Interface de dados (`TasksData`) | em `data/<recurso>.ts` |
| Usado por duas ou mais telas | sobe para `shared/` (regra de três) |

> **Por quê.** A dependência vai do consumidor para o produtor (R7). Se o tipo do modelo de
> exibição morasse no componente, o `domain.ts` precisaria importar o componente para saber o
> formato que devolve, e uma regra pura passaria a depender do visual. As props, que descrevem
> **como desenhar**, ficam no componente.

**Não existe pasta global `types/`.** Ela vira depósito, longe da regra e de quem a entende.
**Quando criar `types.ts`:** só se dois arquivos da **mesma pasta** precisarem do mesmo tipo e
deixá-lo em um deles criar importação circular (por exemplo `domain` ↔ `model`). Aí nasce ali,
naquela pasta.

**Convenções:**

- `import type { ... }` para o que só é tipo: some no build e não pesa na ordem de carregamento.
- Nome pelo papel: `...Props`, `...View`, `...State`, `...Deps`, `...Dto`, `...Input`.
- Tipos de função **exportada** são explícitos (parâmetros e retorno), porque são a superfície
  pública; nas internas, deixe o TypeScript inferir.
- Nada de prefixo `I`, nada de `any`, e não duplicar no front um tipo que já existe no contrato.
- Para dinheiro e datas, tipos nomeados (`Cents`, `IsoDate`) evitam passar um número no lugar do
  outro.
- **Documentação ao lado da regra:** comente o **porquê**, não o quê (§8.1), no próprio tipo ou
  função (`/** Regra pura: ... */`). O editor mostra esse texto em qualquer arquivo que os use.
  Quando der, deixe o tipo carregar a regra (uma união documenta melhor que um comentário).

### 6.9 Importações

```
página ou componente ──► domain (do mesmo lugar)
        │
        ├─► hook ──► shared/ ──► data/ ──► infra/
        │
        └─► components/ ──► shared/
```

1. `domain` não importa nada de React nem do projeto.
2. Página não importa de dentro de outra página.
3. Componente e hook só importam de `shared/` e do contexto, nunca de `pages/`.
4. Só `data/` e `infra/` tocam o mundo de fora; só `main.tsx` o cria.

**Sem barrel geral.** Não existe `components/index.ts`: cada componente é importado do seu
arquivo. A pasta de um componente com regra tem `index.ts` próprio, que exporta o componente e,
se fizer sentido, o hook, e ninguém importa de dentro dela.

> **Por quê.** Quando se importa um nome de um barrel, o servidor de desenvolvimento e os
> testes precisam processar **todos** os arquivos que ele reexporta. No build de produção o
> tree-shaking costuma descartar o que ninguém usa, então o custo está no desenvolvimento e nos
> testes, não no pacote final. Há também risco de importação circular. Vale confirmar medindo no
> projeto. **Custo aceito:** quando um componente simples vira pasta, os imports que o apontam
> precisam ser atualizados (o editor faz a busca e a substituição).
> O `client-web` hoje usa `components/index.ts` como única porta e **não é afetado** por esta
> regra até querer migrar.

### 6.10 Dependências por contexto

O `main.tsx` cria o mundo real uma vez e o entrega por contexto; a página pega com
`useServices()` e passa ao model. O teste injeta um fake no mesmo ponto, sem mock de módulo.

```tsx
// main.tsx
const services = createServices({ tasks: createHttpTasksData(http), clock: systemClock });
root.render(<ServicesProvider value={services}><App /></ServicesProvider>);
```

`createServices`, `ServicesProvider` e `useServices` ficam em `shared/services.tsx`: todas as telas os
usam, e hooks e componentes só podem importar de `shared/` e do contexto (§6.9). O `main.tsx` só
os importa e os preenche com o mundo real.

### 6.11 Estado: todo estado tem um dono

Antes de criar a variável, pergunte de quem é o estado:

| Origem | Onde vive | Exemplo |
|---|---|---|
| servidor ou banco local | `data/`, lido pelo model, com cache e revalidação do React Query | lista de pendências |
| URL | a própria URL | filtro, página, aba ativa |
| sessão | armazenamento do cliente | tema, token |
| componente | dentro dele | menu aberto, campo em edição |

Dado do servidor copiado para variável global é a origem de metade dos bugs de tela: duas cópias
do mesmo dado que divergem. O que cabe na URL **deve** morar na URL: é o que torna a tela
compartilhável e o botão voltar correto. **Não guarde em estado o que dá para calcular**: derive
no render ou em uma função de `domain`. **`useEffect` só para sincronizar com o mundo de fora**
(agendar lembrete, ouvir o teclado), nunca para derivar valor.

**Quando dividir a tela em página + model (+ domain).** Tela que só mostra texto estático é um
arquivo. O model entra quando aparece **estado que muda por mais de um motivo** (formulário com
validação, filtro + paginação, atualização otimista, dois componentes com o mesmo estado). Gatilho
prático: a página passou de ~150 linhas, ou você quer testar um estado (erro, vazio, salvando) sem
renderizar a tela.

**Componente é apresentação por padrão:** recebe dados, emite eventos, não busca nada. Extraia um
novo quando o mesmo bloco aparecer pela 3ª vez ou o arquivo passar de ~200 linhas, não antes.
Condição grande no JSX vira variável com nome (`const canComplete = ...`), e variante é uma união
(`tone: "neutral" | "danger"`), não uma pilha de booleanos.

### 6.12 O que evitar

- Página que busca dado, decide regra e desenha tudo.
- `useEffect` que copia propriedade para estado.
- Passar a mesma propriedade por três níveis (a saída é composição ou contexto).
- Guardar dado do servidor num store global.
- `useMemo` e `useCallback` espalhados sem medir.
- Regra de negócio escrita como hook, ou em middleware, ou no componente.
- Método de classe passado como callback (perde o `this`).

> **O que este documento não cobre no frontend:** design visual, acessibilidade e performance
> de renderização. São disciplinas próprias, com critérios que não saem daqui. O escopo aqui é
> arquitetura e testabilidade, e nesse eixo o frontend não é um mundo à parte, é o mesmo padrão
> com outros nomes.

---

## 7. Testes — parte do front-end

> A forma, as metas e o jeito de escrever teste estão em `PADRAO-NUCLEO.md` (§7.1–§7.5).

### 7.6 Testes do front-end

O desenho do §6 existe também para isto: cada camada se testa sozinha, e nenhuma exige mock de módulo.

| Camada | Como testa | O que não precisa |
|---|---|---|
| `domain` (função ou classe) | chama com um valor e confere o resultado; classes com um builder (`makeTask({ status: "done" })`) | React, banco, relógio real |
| `model.ts` | `renderHook` dentro de um `QueryClientProvider` **novo por teste** (sem retentativas), com um **fake** da interface de `data/`, nos quatro estados | rede, banco, tela |
| componente | renderiza com **propriedades fixas** e confere a interação | provider, mock de módulo |
| `data/` | HTTP: fake alimentado por **resposta real gravada** + schema do contrato; banco local: SQLite real em memória com as migrações | a rede (no HTTP) |
| contrato | casos válidos e inválidos de cada schema | tudo |
| E2E | 3 a 5 fluxos críticos | nada |

```ts
it("mostra o erro quando a lista de pendências não carrega", async () => {
  const tasks = createFailingTasksData();      // fake: list() rejeita
  const { result } = renderHook(() => useToday({ tasks, finance, clock }), {
    wrapper: createTestQueryWrapper(),
  });

  await waitFor(() => expect(result.current.status).toBe("error"));
});
```

> **Regra prática.** Se um componente precisou de mock para ser testado, ele está fazendo coisa
> demais: a regra deveria estar no `domain` e os dados deveriam chegar por propriedade.
> Uma classe de domínio também tem o seu teste: o construtor recusa estado inválido, e cada método
> que "muda" devolve **outra instância** sem alterar a original (§3.6).

---

## 11. Ilustração — app local

> As ilustrações de servidor (§11.1 e §11.2) estão em `PADRAO-BACKEND.md`.

### 11.3 O Prumo: a árvore esperada e as exigências do produto

Um app mobile para uma pessoa: pendências em ciclos semanais, envelopes de orçamento, metas e
histórico. Roda no aparelho, sem servidor.

```
prumo/
├─ CLAUDE.md · README.md              instruções da IA · como rodar (≤ 5 comandos) e como testar          F0
├─ package.json · pnpm-lock.yaml      um app, um package.json (Nível 1)                                   F0
├─ biome.json · tsconfig.json         lint e formatação · tipos estritos                                  F0
├─ vite.config.ts · index.html                                                                            F0
├─ tailwind.config.ts · postcss.config.js    tokens do Tailwind                                           F0
├─ capacitor.config.ts · android/     casca nativa; android/ é gerada pelo Capacitor                      F0
├─ prumo.html                         protótipo: só referência visual
├─ migrations/
│  └─ 0001-init.sql · 0002-...        as mesmas migrações no app e nos testes; uma por mudança            F1
├─ e2e/                               Playwright, 3 a 5 fluxos críticos                                     F2 em diante
├─ doc/
│  ├─ adr/                            decisões do projeto (o 0001 já existe)
│  ├─ standards/                      cópia do padrão (README.md é o guia)
│  └─ business-rules/                 regras de negócio: do dono do produto, a IA só entra se ele pedir
└─ src/
   ├─ main.tsx                        liga o mundo real: banco, migrações, relógio, lembretes,            F0
   │                                  adaptadores de data/ e QueryClient
   ├─ app.tsx                         rotas (aba ativa e filtros na URL)                                  F0
   ├─ styles/
   │  └─ tokens.css · globals.css     tokens de cor e Tailwind                                            F0
   │
   ├─ components/                     componentes de várias telas; cada um nasce no 3º uso
   │  ├─ button.tsx · chip.tsx · progress-bar.tsx · bottom-sheet.tsx     só visual: um arquivo cada
   │  └─ task-row/                    pasta, porque tem regra de exibição; usada em 4 telas               F3
   │     ├─ task-row.tsx              layout
   │     ├─ domain.ts · domain.test.ts    regra de exibição (rótulo de prazo, tom, valor)
   │     ├─ use-task-row.ts           só se precisar de contexto
   │     └─ index.ts                  exporta o componente (e o hook, se houver)
   │
   ├─ pages/                          uma pasta por rota; cada uma: *-page.tsx · model.ts · domain · components/ · testes
   │  ├─ tasks/                       tasks-page.tsx · model.ts · domain/ (TaskList, TaskDisplay, Money) · components/   F1
   │  ├─ money/                       money-page.tsx · model.ts · domain/ (EverydayBudget, Payables) · components/   F2
   │  ├─ today/                       today-page.tsx · model.ts · domain/ (EverydayBudget, TodayAgenda, CycleProgress) · components/   F4
   │  ├─ goals/                       goals-page.tsx · model.ts · domain/ (GoalBoard, RequiredPace) · components/   F5
   │  └─ history/                     history-page.tsx · model.ts · domain.ts (visões derivadas)               F6
   │
   ├─ shared/                         regra ou utilitário de duas ou mais telas, sem ser visual
   │  ├─ services.tsx                 createServices · ServicesProvider · useServices                     F1
   │  ├─ iso-date.ts · day-labels.ts · ids.ts   datas AAAA-MM-DD, nome de dia e de mês, geração de ids   F1
   │  ├─ icon.tsx · tab-bar.tsx       ícones e barra de abas                                              F2
   │  ├─ tasks/
   │  │  ├─ domain/                   pasta: dois conceitos, uma classe por arquivo                       F1
   │  │  │  ├─ task.ts · task.test.ts       classe Task
   │  │  │  └─ cycle.ts · cycle.test.ts     classe Cycle
   │  │  ├─ task-completion.ts · task-completion.test.ts   (em domain/) o lançamento que concluir gera e o efeito dele
   │  │  └─ use-complete-task.ts · complete-task-sheet.tsx   concluir com valor lança no envelope; reabrir remove   F3
   │  ├─ finance/
   │  │  └─ domain/                   pasta: dois conceitos que não se chamam                             F2
   │  │     ├─ envelope.ts · envelope.test.ts          classe Envelope (situação do envelope)
   │  │     ├─ transaction.ts · transaction.test.ts    classe Transaction (lançamento)
   │  │     ├─ ledger.ts · ledger.test.ts              classe Ledger (contas sobre os lançamentos)
   │  │     └─ money.ts · money.test.ts                classe Money (ler e mostrar valor)
   │  └─ goals/
   │     └─ domain/                   pasta: meta e o que se calcula dela para várias telas               F5
   │        ├─ goal.ts · goal.test.ts                  classe Goal (meta de guardar)
   │        └─ goal-progress.ts · goal-progress.test.ts  classe GoalProgress (guardado, prazo, texto)
   │
   ├─ data/                           único lugar com SQL. Cada arquivo: interface + adaptador SQLite
   │  │                               + fake + schema Zod + chaves de consulta
   │  ├─ tasks.ts · tasks.test.ts                                                                         F1
   │  ├─ transactions.ts · transactions.test.ts                                                           F2
   │  ├─ goals.ts · goals.test.ts                                                                         F5
   │  └─ backup.ts · backup.test.ts   schema e versão do arquivo de backup                                  F8
   │
   └─ infra/                          capacidades técnicas, cada uma atrás de uma interface, com fake
      ├─ sqlite.ts                    abre o banco e roda as migrações                                    F1
      ├─ test-database.ts             SQLite em memória com as mesmas migrações                           F1
      ├─ clock.ts                     relógio injetável                                                   F1
      ├─ reminders.ts                 notificação local atrás da interface Reminders                      F7
      └─ backup-file.ts               exportar e importar arquivo                                         F8
```

**Como ler a árvore.** `F0` a `F8` são as fatias do ADR 0001: **cada peça nasce na fatia indicada, não
antes**, e nada é criado vazio. Os arquivos de teste ficam ao lado do que testam.

- **Conceito que o banco também usa nasce em `shared/`.** `Task`, `Cycle`, `Envelope` e `Transaction`
  moram em `shared/<área>/domain/` desde a fatia em que nascem, porque `data/` não pode importar de
  `pages/` (ADR 0003). Já as classes de cálculo e exibição da tela (`TaskList`, `Ledger`,
  `EverydayBudget`) começam em `pages/<tela>/domain/` e sobem para `shared/` na terceira tela (§6.3).
- **Arquivo que vira pasta:** `domain.ts` de uma tela vira `domain/` ao passar de ~300 linhas ou com
  dois grupos de regra que não se chamam; `data/<recurso>.ts` vira pasta no mesmo limite. O
  `model.ts` nunca vira pasta (§6.4).
- **Decisões do projeto (confirmadas):** os testes E2E ficam em `e2e/` na raiz, que o padrão não fixa; o schema
  e a versão do arquivo de backup ficam em `data/backup.ts` (§12.3); o contexto de serviços fica em
  `shared/services.tsx` (§6.10).
- Fora da árvore: `node_modules/`, `dist/`, `.gitignore` e demais arquivos gerados ou de ferramenta.

**Cada exigência do produto, resolvida sem arquitetura nova:**

| Exigência | Como o padrão resolve | Peça |
|---|---|---|
| Registrar um gasto sem internet | dados em SQLite no aparelho; `data/` com adaptador SQL | §12 |
| "Quanto posso gastar hoje" | regra pura em `shared/finance/domain/`, com o relógio injetado; testada sem banco | R1, R3, §3.6 |
| Concluir uma pendência com valor lança no envelope | hook `use-complete-task` em `shared/tasks/`, usado por 4 telas, que invalida a consulta ao terminar | §6.3, §6.6 |
| A mesma pendência aparece em 4 telas | uma consulta compartilhada: concluir em uma tela atualiza as outras | §6.6 |
| A linha de pendência é igual em 4 telas | `components/task-row/` é pasta (layout + `domain.ts`), porque carrega regra de exibição | §6.3, §6.4 |
| Lembrete de vencimento com o app fechado | `infra/reminders.ts` atrás de uma interface, com fake nos testes | §4.2 |
| Backup e restauração | `infra/backup-file.ts`; o arquivo importado é validado por schema e leva a versão do formato | §4.2, §12.4 |
| Sincronizar entre aparelhos, no futuro | muda o adaptador de `data/`; ids no aparelho, `updatedAt` e `deletedAt` já estão no formato | §6.7, §12.4 |

**Por que `shared/finance/domain/` é pasta e `pages/today/domain.ts` é arquivo.** O domínio de
finanças tem conceitos que não se chamam entre si (`Envelope` e `Transaction`), e com classes o
natural é uma por arquivo, então passou do gatilho do §3.6. As regras de exibição da tela "Hoje"
tratam de um conceito só e cabem em um arquivo, então continuam arquivo até um gatilho dizer o
contrário. `pages/tasks/domain/` e `pages/money/domain/` são pastas pelo mesmo motivo (ADR 0003).

**O ponto:** é o mesmo padrão do todo list e da plataforma social, só que com a metade servidor
ausente. O que muda é o adaptador (SQL em vez de HTTP); a tela, o model e o domínio são os mesmos.

---

## 12. App local (sem servidor)

Vale para o app que roda inteiro no aparelho: dados num SQLite local, sem API, sem conta,
funcionando sem internet (por exemplo, um app mobile pessoal). **Não é uma arquitetura à parte:**
o front-end é o do §6 e o domínio é o do §3.6. Esta seção diz só o que **muda**, e por quê,
quando falta a metade "servidor".

### 12.1 Nível

É **Nível 1** (§5): um app, um `package.json`. Se aparecer um servidor (por exemplo, para
sincronizar entre aparelhos), ele é o **segundo artefato implantável**: o projeto sobe para N2 e o
contrato (§3.5) nasce nesse momento, não antes.

### 12.2 O que não existe, e por quê

| Peça de um app com servidor | No app local | Por quê |
|---|---|---|
| `routes.ts`, middlewares, tradução de erro em status (§3.4) | não existem | não há HTTP: a porta de entrada é a página |
| `packages/contracts` e monorepo | não existem | é um app só, sem segundo consumidor (§3.5, §5) |
| `modules/` e `composition/` do back-end | não existem | a regra nasce na tela e sobe para `shared/` pela regra de três (§6.3) |
| Adaptador HTTP em `data/` | o adaptador é SQL | a interface é a mesma (§6.7) |

**Quando `modules/` volta.** Se `shared/` passar de uns dez arquivos de regra, agrupe por assunto
(`shared/tasks/`, `shared/finance/`). Se as regras de um assunto começarem a depender das de outro
de forma emaranhada, promova os grupos a `modules/` e crie a composição (§3 e §4.3). É mover
pastas, sem reescrever.

### 12.3 O que muda no front-end

O front-end é o do §6. As diferenças:

- **O adaptador de `data/` usa SQL** e converte entre a linha do banco e a classe com
  `fromRecord` e `toRecord`, no lugar de `fromContract` e `toContract` (§3.6).
- **O schema Zod das linhas e do arquivo de backup mora em `data/`**, no papel que o contrato
  teria. O dado que vem do banco ou de um arquivo importado é entrada não confiável (§4.2): valida
  na borda e falha alto ali.
- **`infra/` guarda a conexão com o banco** (`sqlite.ts`, que abre e roda as migrações), além do
  relógio, das notificações e do arquivo de backup. Cada um atrás de uma interface, com fake nos
  testes.
- **`main.tsx` abre o banco, roda as migrações e cria os adaptadores** antes de renderizar o app.
- **Se um servidor vier,** o `fromRecord` ganha um irmão, o `fromContract`, e **nenhuma tela
  muda**: só os adaptadores de `data/`.

A árvore de pastas é a do §6.2. O que o app local acrescenta: `migrations/0001-init.sql` na raiz (as
mesmas migrações no app e nos testes) e, em `infra/`, `sqlite.ts`, `clock.ts`, `reminders.ts`,
`backup-file.ts` e `test-database.ts`. Em `data/`, cada recurso tem interface, adaptador SQL e fake
(`tasks.ts`, ...).

### 12.4 Dados

| Regra | Por quê |
|---|---|
| **Dinheiro em centavos inteiros** (`amountInCents`); a formatação em moeda fica só na camada visual | decimal acumula erro de ponto flutuante (0,1 + 0,2 não é 0,3), e erro de centavo em app financeiro é bug de confiança |
| **Datas como texto `AAAA-MM-DD`** (data local, sem hora) e **relógio por parâmetro** (R3) | fuso e horário de verão quebram "hoje"; com o relógio injetado, qualquer regra que dependa de "hoje" é testável |
| **Migrações em arquivos `.sql`**, as mesmas no app e nos testes | o teste de banco usa as migrações reais (§7.5); mock de banco testa o mock |
| **Linhas do banco e arquivo de backup validados com schema na borda** | arquivo importado é entrada não confiável; um backup corrompido tem que falhar com mensagem clara, não três camadas depois |
| **Versão do formato dentro do arquivo de backup** | o formato muda com o tempo, e importar um arquivo antigo precisa saber o que ele é |

**Preparação barata para sincronizar depois.** São decisões de **formato de dado**, não de
estrutura, então não contrariam a regra de não antecipar (§1): custam quase nada agora e evitam
reescrever dados depois.

| Decisão | Por quê |
|---|---|
| **Ids gerados no aparelho** (UUID ou ULID), nunca autoincremento | dois aparelhos criando registros offline gerariam o mesmo número |
| **`updatedAt` em todo registro** | é o que permite decidir qual versão vale quando dois aparelhos editam o mesmo dado |
| **Apagar marcando `deletedAt`**, não removendo a linha | uma exclusão precisa viajar para o outro aparelho; linha removida simplesmente some e "reaparece" na sincronização |
| **Guardar os lançamentos e derivar o saldo**, em vez de gravar o saldo | na estratégia "o último a escrever vence", um saldo gravado como 120 num aparelho e 80 no outro fica com um dos dois e perde o outro em silêncio |

### 12.5 Testes

Valem as camadas e os exemplos do §7.6. A diferença do app local é só o banco: o teste de `data/` usa
SQLite real em memória com as mesmas migrações (§7.5), e o teste do `model.ts` pode usar o fake da
interface de `data/` ou esse mesmo SQLite em memória.

### 12.6 Exemplo

O Prumo (pendências e finanças pessoais, Android) segue este desenho. As decisões estão no ADR
0001 do projeto. A ilustração completa está no §11.3.
