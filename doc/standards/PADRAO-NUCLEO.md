# Padrão de Desenvolvimento — Núcleo

> Cópia do projeto (2026-11-13): vale esta, não `C:\Dev`.

> O que vale para **qualquer** projeto, com ou sem servidor, com ou sem tela: as 7 regras, o
> domínio, os níveis, os testes em geral, as convenções, as ferramentas e os checklists.
> Mapa de seções e o que ler conforme o projeto: `README.md`.
> Este arquivo é lido **sempre**, junto com o do lado que você vai construir.

---

## 2. As 7 regras que não mudam

Estas valem em qualquer linguagem, framework ou tamanho de app. São o padrão de verdade —
o resto do documento é consequência delas. Cada uma existe por um motivo prático:
**código difícil de testar é código com problema de design**, e corrigir o design resolve os dois.

### R1 — Regra pura no meio, I/O na borda

O que decide é função pura: recebe dados, devolve dados. O que faz I/O (banco, rede,
arquivo, relógio) fica na casca. Uma regra pura é testável sem nada em volta — sem banco,
sem servidor, sem mock.

```
❌  função que consulta o banco, aplica a regra e formata a resposta
✅  repositório busca → função pura decide → rota formata
```

### R2 — Dependência entra por parâmetro, nunca por import

Um `import { db }` no topo de um caso de uso é uma dependência **impossível de
substituir**. Recebida por parâmetro (construtor ou factory), ela vira o ponto onde o
teste injeta um substituto.

```ts
// ❌  acoplado: para testar, tem que hackear o sistema de módulos
import { db } from "../infra/db";
export async function createTask(title: string) { ... }

// ✅  injetável
export function createTaskService({ tasks, clock }: Deps) {
  return { create: async (title: string) => { ... } };
}
```

### R3 — Tempo, aleatoriedade e ambiente são dependências

`new Date()`, `random()`, `uuid()` e variáveis de ambiente dentro de uma regra tornam o
teste não determinístico. Entram como dependência **com valor padrão**, para não pesar
no uso normal:

```ts
function createService({ repo, now = () => new Date() }) { ... }
// no teste: now: () => new Date("2026-01-15T12:00:00Z")
```

### R4 — Cada camada devolve dado, não transporte

O caso de uso devolve o objeto; quem transforma em resposta HTTP, mensagem de WebSocket
ou linha de CLI é a borda. Caso de uso que devolve `Response` só pode ser testado por HTTP.

### R5 — Erro de domínio é tipado; tradução fica na borda

```ts
class NotFound extends Error {}
class RuleViolation extends Error {}
class Forbidden extends Error {}

// um único lugar no app conhece códigos HTTP
onError(err => {
  if (err instanceof NotFound)      return json({ error: err.message }, 404);
  if (err instanceof Forbidden)     return json({ error: err.message }, 403);
  if (err instanceof RuleViolation) return json({ error: err.message }, 422);
  return json({ error: "Erro interno" }, 500);
});
```

Devolver `null` para "não achei" confunde inexistência com falta de permissão, e não
escala quando aparece a terceira condição de erro.

### R6 — Nada acontece ao importar um módulo

Importar não pode abrir conexão, ler configuração nem instanciar nada. Tudo isso acontece
**uma vez**, no ponto de entrada do app (`main`/`index`), que é o único arquivo que
conhece o mundo real. Sem isso, todo teste arrasta a infraestrutura junto.

### R7 — A dependência aponta só para dentro

```
borda (HTTP, WS, job, UI)  →  caso de uso  →  regra pura
                           →  adaptador (banco, e-mail, storage)
```

A regra pura não conhece o caso de uso; o caso de uso não conhece a borda. Se você
precisou importar "para fora", a peça está no lugar errado.

> **Como verificar as 7 de uma vez:** consigo testar a regra de negócio deste app
> sem subir banco, sem subir servidor e sem mockar nada? Se não, alguma regra foi violada.

---

## 3. A forma de um módulo — parte comum

> Esta seção está dividida: o módulo, o contrato e os gatilhos de crescimento estão em
> `PADRAO-BACKEND.md` (§3.1–§3.5). Aqui fica só o **domínio** (§3.6), que o back-end e o
> front-end usam do mesmo jeito.

### 3.6 Domínio: funções e classes

**O que é `domain`.** É o lugar das **regras puras**: recebe dados, devolve dados, sem React,
sem banco, sem relógio, sem rede. O teste para saber se algo é domínio:

> Consigo testar isso chamando com um valor, sem subir nada?

Se sim, é domínio. Se precisa de React, banco ou da hora do sistema, não é (R1, R3).

**Dois tipos de regra, o mesmo nome de arquivo.** Em um app há regra de **negócio** ("o que é
verdade": envelope estourado, o que é "pode gastar hoje") e regra de **exibição** ("como
mostrar": o rótulo "Atrasada 2 dias", a cor de perigo). As duas são puras e têm o mesmo formato.
O que as distingue é o **escopo**, ou seja, a pasta onde o arquivo mora (§6.3). Usar o mesmo
nome (`domain`) nos dois casos foi uma escolha deliberada: um nome só para decorar, com o
significado "as regras deste lugar".

> **Por que `domain` e não `utils`.** `utils` é uma sacola: diz que o arquivo é útil, não o que
> ele é, e tudo vira "mais uma funçãozinha". A regra de um lugar tem dono, que é esse lugar. O
> §8.3 reserva o utilitário sem dono para `shared/`.

**Funções ou classes.** Decisão: **classe imutável** para o que é um **conceito com identidade
e invariante** (`Task`, `Envelope`, `Cycle`); **função pura** para cálculo solto e para regra de
exibição.

| | Função pura | Classe imutável |
|---|---|---|
| Boa para | cálculo (`describeRequiredPace`), exibição (`toTaskRowView`) | conceito do negócio, com dados e regras que o protegem juntos |
| Estado inválido | precisa checar em cada chamada | impossível: o construtor recusa |
| Dado de fora (JSON, linha do banco) | usa direto, já é objeto simples | precisa de conversão na borda (`fromContract`, `fromRecord`) |

> **Por que classes.** É uma preferência de quem mantém: dado e regra juntos, e a classe pode
> **recusar estados inválidos já na construção**. O `client-web` hoje usa só funções para o
> domínio (as únicas classes são os erros tipados), e este padrão não obriga ninguém a migrar.

**Custos aceitos conscientemente:**

- **Conversão nas bordas.** O contrato e o JSON são objetos simples, então toda leitura passa
  por `Task.fromContract(dto)` e toda gravação por `task.toContract()`. É um ponto a mais para
  esquecer, e por isso a conversão mora em **um só lugar por lado** (abaixo).
- **Imutável sempre.** React e React Query só percebem mudança em dado novo. Um método que muda
  o estado (`complete()`) **devolve outra instância**; nunca altera a atual.
- **`this` solto.** `onClick={task.complete}` perde o `this` e falha em silêncio. Passe uma
  função (`() => onComplete(task)`), nunca o método.
- **Menos remoção de código morto no build:** métodos de classe não saem um a um. Para a escala
  de um app comum, o efeito é pequeno; mesmo assim, não serve de motivo para classes de
  cálculo, que continuam funções.

```ts
// domain/task.ts
type TaskProps = { id: TaskId; title: string; status: TaskStatus; dueDate: IsoDate | null };

export class Task {
  private constructor(private readonly props: TaskProps) {}

  static fromContract(dto: TaskDto): Task {
    if (dto.title.trim() === "") throw new RuleViolation("A pendência precisa de um título.");
    return new Task({ id: dto.id, title: dto.title, status: dto.status, dueDate: dto.dueDate });
  }

  /** Atrasada: tem prazo anterior a hoje e ainda não foi concluída. */
  isOverdue(today: IsoDate): boolean {
    const dueDate = this.props.dueDate;
    const isOpen = this.props.status !== "done";
    return isOpen && dueDate !== null && dueDate < today;
  }

  complete(): Task {
    if (this.props.status === "done") throw new RuleViolation("A pendência já foi concluída.");
    return new Task({ ...this.props, status: "done" });
  }

  toContract(): TaskDto {
    return { ...this.props };
  }
}
```

**Onde a conversão acontece (um lugar por lado):**

- **Site:** o adaptador em `data/` valida a resposta com o schema e chama `fromContract`; o
  `model.ts` e as telas só enxergam a classe. Ao enviar, chama `toContract()`.
- **API:** o `routes.ts` valida a entrada e converte; o repositório converte entre a linha do
  banco e a classe; a resposta sai com `toContract()`. No back-end há **três formatos** (banco,
  classe, contrato), e a classe é o centro.

**Domínio como arquivo ou como pasta.** O mesmo princípio do §3.2: arquivo quando basta, pasta
quando precisa.

| Forma | Quando | Exemplo |
|---|---|---|
| `domain.ts` | até ~300 linhas **e** as regras se chamam entre si ou tratam do mesmo conceito | as regras de pendência de uma tela pequena |
| `domain/` | o arquivo passou de ~300 linhas, **ou** tem dois grupos de regras que não se chamam (mesmo gatilho do "segundo service", §3.2) | `domain/task.ts`, `domain/cycle.ts`, `domain/envelope.ts` |

Regras da pasta: nunca existem `domain.ts` e `domain/` juntos (quando vira pasta, o arquivo
some); a pasta só tem `index.ts` quando algo de fora precisa de uma porta única (por padrão não
há barrel, §6.9), e então ele só reexporta o que sai dali; cada arquivo guarda um conceito e o teste fica ao lado (`task.test.ts`).
**Com classes, a pasta chega mais cedo**, porque o natural é uma classe por arquivo.

> **Como tomar a decisão ao ver um `domain.ts` ou um `domain/`.** Um é arquivo porque ainda
> cabe e as regras são de um conceito só; o outro é pasta porque passou do limite ou porque tem
> conceitos independentes. Se alguém precisar adivinhar o motivo, o gatilho acima deveria
> responder; se não responder, o padrão está incompleto.

**Escada de escopo das classes** (a mesma lógica dos componentes, §6.3):

| Escopo | Onde mora |
|---|---|
| só de uma peça | `modules/<x>/domain/` (API) · `pages/<x>/domain/` (site) |
| duas ou mais peças do mesmo app | `shared/` do app (por exemplo `Money`, `IsoDate`) |
| API e site usam **a mesma** classe | `packages/domain` |

A promoção segue a regra de três (§8.3). **Para `packages/domain`, a decisão é começar com cada
lado tendo a sua classe** e criar o pacote só para objetos de valor pequenos e estáveis (dinheiro,
datas) quando eles se repetirem. Motivo: um pacote de domínio compartilhado acopla os dois apps a
uma mesma versão do comportamento. A direção das dependências é `contracts` ← `domain` ← `apps`:
o pacote de domínio pode importar tipos do contrato, e o contrato nunca importa o domínio.

**Tipos ficam ao lado de quem os produz.** O tipo do que uma regra devolve mora no arquivo dela
(`TaskRowView` em `domain.ts`, junto de `toTaskRowView`). Quem consome importa com
`import type`. Detalhes no §6.8.

---

## 5. Os três níveis

O nível não é sobre ambição — é sobre **pressão já sentida**. Cada nível **adiciona** ao
anterior; nada é refeito.

| | **N1 — app de uma coisa** | **N2 — app com áreas** | **N3 — plataforma** |
|---|---|---|---|
| Exemplo | todo list, painel de cotações, rastreador de hábitos | gestor de recursos, gestor de projetos | rede social, SaaS multi-tenant |
| Módulos do back-end (pastas em `src/modules/`) | 1–3 | 4–10 | 10+, alguns removíveis |
| Front-end (§6) | `pages/`, `components/`, `shared/` e `data/`: o mesmo desenho nos três níveis | idem | idem; cresce a quantidade de telas, não a forma |
| Domínio (§3.6) | `domain.ts` (arquivo) até ~300 linhas; classes só para conceitos | `domain/` onde crescer | idem; `packages/domain` só para objetos de valor compartilhados |
| Repositório | um app, um `package.json` | monorepo: `apps/` + `packages/` | idem |
| Contrato back↔front | tipos importados direto (app local: schema na borda de `data/`, §12) | pacote `contracts` compartilhado (§3.5) | idem, versionado |
| `repository.ts` | não | onde a consulta doer | sim, quase sempre |
| Eventos entre módulos | não | raro | sim, é o mecanismo padrão |
| Camada de composição | não | quando surgir a 1ª integração | sim |
| Componentes compartilhados | `components/` do app, quando o 3º componente se repetir (§6.3) | idem | pacote próprio (`ui`) |
| Testes | domain + bordas | + modelos de tela + 1 e2e | + contrato entre módulos, + e2e por área |
| Fundação | ~2 horas | ~1 dia | ~3 dias |

> **Portas e adaptadores não entram nesta tabela** — são ortogonais ao nível. Um app N1
> pode precisar de WebSocket, de fila ou de três integrações externas no primeiro dia; o
> que o nível mede é **quanta estrutura existe em volta dos módulos**, não com o que o app
> conversa. Precisar de tempo real não obriga ninguém a virar plataforma.

**Gatilhos para subir de nível:**

- **N1 → N2 (é quando nasce o monorepo):** apareceu um **segundo artefato implantável**
  que compartilha código com o primeiro — outro cliente da mesma API, um app desktop, um
  worker separado, o servidor de sincronização de um app local — ou o mesmo tipo foi escrito à mão nos dois lados e desincronizou.
  *Quantidade de módulos não é gatilho:* 20 módulos numa pasta `src/modules/` continuam
  sendo um app só, e devem continuar.
- **N2 → N3:** um módulo precisou reagir a outro pela terceira vez, ou um módulo precisa
  poder ser desligado sem quebrar o resto.

**O que existe desde o Nível 1, sem exceção:** as 7 regras (§2), tipagem estrita,
lint automático, um runner de teste com testes de verdade, e CI rodando os três.
Isso é a fundação de 2 horas que não se pula — é o que permite tudo o mais ser adicionado depois.

---

## 7. Testes

> O §7.6 (testes do front-end) está em `PADRAO-FRONTEND.md`.

### 7.1 A forma

Mais investimento em **integração** (o que dá confiança real), base larga de análise
estática (custo zero), unitário concentrado onde há **regra densa**, e uma casquinha de
ponta a ponta. O princípio: *quanto mais o teste se parece com o uso real, mais confiança ele dá.*

```
      ╱  E2E  ╲          3 a 5 fluxos por app. Só o caminho crítico.
    ╱───────────╲
  ╱  INTEGRAÇÃO  ╲       ← maior investimento: borda → caso de uso → banco de verdade
 ╱─────────────────╲
╱     UNITÁRIO      ╲    regra pura (domain), modelos de tela, utilitários
──────────────────────
       ESTÁTICO          tipos estritos + lint + schema de validação. Roda a cada tecla.
```

### 7.2 O que testar em cada camada

| Camada | Testa | Substitui |
|---|---|---|
| regra pura (`domain`) | casos de borda da regra | **nada** |
| caso de uso (`service`) | orquestração, transação, erro de regra | repositórios (por fake) |
| borda (`routes`, `socket`) | status, validação, permissão | nada |
| adaptador (`repository`) | consulta e mapeamento corretos | nada — banco de teste real |
| modelo de tela (`model.ts`) | carregando, vazio, erro, sucesso (§6.6) | a interface de `data/`, por um fake |
| componente | interação do usuário; estados por propriedades fixas (§7.6) | nada: se precisou de mock, o componente faz demais |
| adaptador de dados (`data/`) | HTTP: contrato + resposta real gravada; banco local: consulta e mapeamento corretos (§7.6) | a rede, no caso HTTP |
| middleware (§3.4) | a tradução: status e cabeçalhos, com um app mínimo | a regra por trás (testada no `domain`) |
| contrato (§3.5) | casos válidos e inválidos de cada schema | nada |
| E2E | fluxo completo | nada |

### 7.3 Metas — em vez de percentual

Cobertura é diagnóstico, não meta (dá para ter 90% testando *getters*).

- **Toda regra pura tem teste.** Inegociável: é o mais barato e o mais valioso.
- **Todo caso de uso:** caminho feliz + pelo menos um erro de regra.
- **Todo módulo:** ao menos um teste de borda que atravessa até a fonte de dados.
- **Toda dependência externa:** um fake com resposta real gravada na suíte normal, e um
  teste de contrato contra a API de verdade fora do CI (§4.4).
- **Todo modelo de tela:** os quatro estados.
- **Todo schema do contrato:** ao menos um caso válido e um inválido.
- **Toda classe de domínio:** o construtor recusa estado inválido, e cada método que "muda" devolve outra instância (§3.6).
- **Todo bug corrigido nasce com um teste que falhava antes.** Esta regra sozinha
  constrói a suíte ao longo do tempo, sem mutirão.
- **E2E:** só fluxos que, quebrados, tornam o app inútil. Nunca mais que 5 por app.

### 7.4 Como escrever

**Nome descreve comportamento**, em português, do ponto de vista de quem usa:

```ts
it("acusa estoque baixo quando o consumível cai abaixo do mínimo", ...)
it("recusa entrada em sala privada de quem não foi convidado", ...)
```

**Arrange–Act–Assert**, com linha em branco separando as três partes.

**Um comportamento por teste.** Se o nome precisa de "e", são dois testes.

**Zero lógica no teste** — sem `if`, sem `for`, sem cálculo. Teste que precisa de lógica
para saber o esperado reimplementa o código e vai errar junto com ele.

**Fake, não mock.** Prefira uma implementação em memória de verdade a um objeto que grava
chamadas: ela sobrevive a refatorações e documenta o contrato.

```ts
export function fakeTaskRepository(seed: Task[] = []) {
  let rows = [...seed];
  return {
    list: async () => rows,
    findById: async (id: string) => rows.find(t => t.id === id),
    insert: async (data) => { const t = { ...data, id: `t${rows.length + 1}` }; rows.push(t); return t; },
  };
}
```

**Builders para dados**, não literais gigantes repetidos: `makeTask({ done: true })`.

**Teste comportamento, não implementação.** Não asserte "o repositório foi chamado duas
vezes"; asserte o resultado observável. Teste acoplado à implementação quebra em toda
refatoração e é a razão nº 1 de suíte abandonada.

### 7.5 Banco nos testes

Teste de integração usa **banco de verdade**, não mock de ORM — mock de ORM testa o
mock. Use uma instância descartável (embarcada, em memória ou container) criada com as
**mesmas migrações da produção**, uma por arquivo de teste, e sem dados compartilhados
entre testes. No app local, a instância é um SQLite em memória com as mesmas migrações do
aparelho (§12.5).

---

## 8. Convenções de código

### 8.1 Clean code — o que aplico de fato

| Regra | Como verifico |
|---|---|
| Nome revela intenção | Entendo a função sem ler o corpo? `isOverdue` sim, `check` não. |
| Função faz uma coisa | Descrevo o que faz sem usar "e"? |
| Um nível de abstração por função | Não misturo consulta ao banco com regra na mesma função. |
| Poucos parâmetros | ≥ 4 → agrupo num objeto nomeado. |
| Sem flag booleana de parâmetro | `save(x, true)` vira `publish(x)` / `saveDraft(x)`. |
| Comentário diz *por quê*, não *o quê* | Se parafraseia o código, o nome está ruim. |
| Sem código morto | Comentado = deletado. O git guarda. |

**Sinais de alerta** (não leis): função > 30 linhas, arquivo > 300, componente > 200.
Não corrija por corrigir — pare e pergunte o que dá para extrair.

### 8.2 SOLID moderado

O objetivo é testabilidade e clareza, não cerimônia.

| | Aplico | **Não** faço |
|---|---|---|
| **S** | uma camada = um motivo para mudar | uma classe por método |
| **O** | quando o `if` por tipo cresce pela 3ª vez, vira mapa/registro | fábrica preventiva para um caso |
| **L** | implementou a interface, respeita o contrato inteiro (o fake também) | herança por conveniência |
| **I** | o caso de uso recebe **só** o que usa, não o container | uma interface gigante |
| **D** | só em dependência externa: banco, e-mail, LLM, vídeo, relógio | interface para `formatMoney` |

> **A regra que resolve 90% dos casos:** crie a interface quando existir a segunda
> implementação — e o *fake de teste* conta como segunda. Não antes.

### 8.3 Reaproveitamento

**DRY é sobre conhecimento, não sobre texto.** Dois trechos parecidos que mudam por
motivos diferentes devem continuar duplicados. **Regra de três:** duplique na 2ª
ocorrência, extraia na 3ª.

Onde mora o código compartilhado: regra → `domain` do módulo dono; formato que trafega →
`contracts`; componente visual → `components/`; utilitário puro sem dono → `shared/`;
lógica entre dois módulos → **nenhum dos dois**, vai para a composição.

### 8.4 Nomes

| Item | Convenção |
|---|---|
| Arquivos e pastas | `kebab-case`, sem exceção |
| Variáveis / funções | `camelCase` (`snake_case` em Python); verbo na função |
| Tipos / classes | `PascalCase`; classe no singular, com o nome do conceito (`Task`, `Envelope`) |
| Constantes | `SCREAMING_SNAKE` |
| Booleanos | prefixo `is/has/can/should` |
| Factory de injeção | `create<X>` |
| Hook | `use<X>` no código; arquivo `use-<x>.ts`. O hook principal da tela é `model.ts` (§6.5) |
| Layout de tela | arquivo `<rota>-page.tsx` (§6.5) |
| Regra pura | `domain.ts` ou pasta `domain/` (§3.6) |
| Conversão de e para o contrato | `fromContract` / `toContract`; para linha do banco, `fromRecord` / `toRecord` |
| Sufixo de tipo por papel | `Props`, `View`, `State`, `Deps`, `Dto`, `Input` (§6.8) |
| Testes | `<arquivo-testado>.test.<ext>` |

**Idioma:** código em inglês; comentários, documentação, nomes de teste e mensagens ao
usuário em português.

### 8.5 Documentação

- **`README.md`** — o que é, como rodar (≤ 5 comandos), como testar. Nada além.
- **`ARCHITECTURE.md`** — as camadas e as regras invioláveis, em 10 minutos de leitura.
  Só a partir do N2.
- **`doc/adr/NNNN-titulo.md`** — decisão com data: contexto, decisão, consequências.
  É o que impede o documento principal de apodrecer: arquitetura muda, e a mudança vai
  para um ADR novo. A pasta se chama `doc/adr` em todos os projetos, o nome que o `client-web`
  já usa; assim há um nome só para lembrar.
- **Regra:** mudou estrutura ou camada → atualiza o `ARCHITECTURE.md` na **mesma** entrega.
- **Toda decisão de estrutura registra o porquê e o gatilho.** Um arquivo ao lado de uma pasta,
  uma regra num lugar e não em outro: deve dar para entender o motivo lendo este documento ou o
  ADR do projeto. Se alguém precisa adivinhar, falta o registro.
- **O ADR de um projeto cita as seções do padrão em que se apoia** e, quando diverge, diz qual
  é a divergência e por quê (como o ADR 0007 do `client-web` faz com `pages` no lugar de `features`).
- **Manutenção deste documento:** antes de uma revisão grande, guarde a versão anterior
  (`PADRAO-DESENVOLVIMENTO.anterior.md`) até a revisão ser aceita. Se houver mais de uma cópia do
  documento, mantenha-as iguais.

---

## 9. Ferramentas

Escolhas de hoje, não parte do padrão. Trocar qualquer linha aqui **não muda nada** das
§2–§8 — é esse o teste de que o padrão está no lugar certo.

| Papel | TypeScript | Python |
|---|---|---|
| Gerenciador de pacotes | pnpm | uv |
| Lint + formatação | Biome | Ruff |
| Tipos | `tsc --noEmit` (`strict`) | ty / mypy |
| Validação de contrato e da borda de dados | Zod | Pydantic |
| Testes | Vitest | pytest |
| Banco de teste | PGlite ou container (servidor); SQLite em memória (app local) | SQLite em memória |
| E2E | Playwright | — |
| Mock de rede (front) | MSW | — |
| API HTTP | Hono | — |
| ORM e banco (servidor) | Prisma + PostgreSQL | — |
| Interface | React + Vite | — |
| Rotas | React Router | — |
| Estilo | Tailwind, com tokens | — |
| Consultas e ações no cliente | TanStack Query | — |
| Teste de componente e de hook | Testing Library | — |
| App mobile / local | Capacitor + SQLite local | — |

As linhas de interface valem para o front-end do §6. Trocar a biblioteca não muda a arquitetura,
desde que os dados cheguem por `data/` e a regra fique em `domain`.

**Critérios ao escolher qualquer ferramenta nova**, em ordem: (1) o desenho continua
testável sem ela? (2) dá para sair dela em um arquivo? (3) ela reduz o número de
ferramentas em vez de somar?

**Scripts com o mesmo nome em todo projeto**, para nunca ter que abrir o manifesto:

```
dev · build · check (lint + typecheck + test) · lint · typecheck · test · test:watch · e2e
```

**CI desde o primeiro commit** — roda `lint`, `typecheck` e `test` em todo push. E2E em
job separado, só na branch principal. Sem CI, o padrão é só intenção.

**Commits convencionais** (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).

---

## 10. Checklists

### 10.1 App novo (fundação — antes da primeira feature)

- [ ] Tipagem estrita ligada no modo mais rígido que a linguagem oferece
- [ ] Lint + formatação automáticos, uma ferramenta só
- [ ] Runner de teste configurado **e um teste de verdade passando**
- [ ] CI rodando lint + typecheck + test
- [ ] Ponto de entrada único que monta as dependências (R6)
- [ ] Primeiro módulo no formato §3.1 — dois arquivos — servindo de molde
- [ ] Front-end (se houver): `pages/`, `components/`, `shared/` e `data/` só quando a primeira peça precisar, nada vazio (§6.4)
- [ ] Interface de dados (`data/`) com um fake para o teste da primeira tela (§6.7)
- [ ] Contrato só se já existir um segundo artefato implantável (§3.5, §5)
- [ ] `README.md` com como rodar e como testar
- [ ] Nível escolhido conscientemente (§5) — na dúvida, N1

### 10.2 Antes de entregar uma mudança

- [ ] `check` passa (lint + tipos + testes)
- [ ] Regra nova está isolada e **tem teste**
- [ ] Nenhuma dependência entrou por import de singleton (R2)
- [ ] Nenhum relógio/aleatório/ambiente dentro de regra (R3)
- [ ] Rota só traduz e página só desenha: nenhuma regra nelas (§3.4, §6.1)
- [ ] Regra nova, de negócio ou de exibição, está em `domain`; o hook só a liga ao React (§6.5)
- [ ] Tipo novo mora ao lado de quem o produz, importado com `import type` (§6.8)
- [ ] Nenhum barrel novo; arquivo virou pasta só por gatilho (§6.4, §6.9)
- [ ] Classe nova é imutável e converte só na borda (§3.6)
- [ ] Corrigi bug? Existe um teste que falhava antes do fix
- [ ] Mudei estrutura? A documentação foi junto (§8.5)
- [ ] Nada de código comentado, log esquecido ou `TODO` sem dono

### 10.3 Cheiros que disparam refatoração

| Cheiro | O que costuma ser | Vai para |
|---|---|---|
| "Não testo sem subir o banco" | dependência importada, não injetada | R2 |
| "Preciso mockar 5 coisas" | a função faz demais | quebrar (S) |
| Teste quebra a cada refatoração | testa implementação | §7.4 |
| Página com 400+ linhas | falta modelo de tela | §6 |
| `if` por tipo em 3 lugares | falta um mapa/registro | (O) |
| Mesmo cálculo em duas telas | regra vazou para a apresentação | `domain` |
| Módulo A importa módulo B | falta evento ou composição | §4.3 |
| Componente decide "atrasada" ou formata valor | regra de exibição vazou para o layout | `domain` do componente (§6.3) |
| Pasta `types/` global com tudo | o tipo está longe de quem o produz | ao lado do dono (§6.8) |
| `if` de negócio dentro de middleware | regra na porta | `domain` + service (§3.4) |
| `useEffect` copiando propriedade para estado | estado derivado | calcular no render (§6.11) |
| `domain.ts` com 300+ linhas ou conceitos que não se chamam | o domínio pediu pasta | `domain/` (§3.6) |
| Hook usado só para fazer conta | regra disfarçada de hook | função pura em `domain` (§6.5) |
| Duas telas divergem sobre o mesmo dado | falta uma consulta compartilhada | `invalidateQueries` (§6.6) |
| Método de classe passado como callback | `this` solto | passar uma função (§3.6) |
| Doc descreve pasta que não existe | falta "doc na mesma entrega" | §8.5 |
