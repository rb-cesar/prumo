# 0003 — Classes no domínio das telas

- **Data:** 2026-11-24
- **Status:** aceita
- **Referências:** `doc/standards/PADRAO-NUCLEO.md` §3.6; `doc/standards/PADRAO-FRONTEND.md` §6.3 e §11.3

## Contexto

O padrão manda usar classe para conceito com identidade e regra (`Task`, `Envelope`) e **função solta**
para cálculo e exibição. Na fatia 2 isso gerou um `domain.ts` de cerca de 330 linhas, com 20 funções
sobre assuntos que não se chamam (calendário, dinheiro, contas dos lançamentos, "pode gastar hoje" e
textos da tela). O dono do produto prefere ler o domínio como classes com métodos.

## Decisão

**Em `pages/<tela>/domain/`, cálculo e exibição também viram classes**, uma por conceito, um arquivo
por classe, com `index.ts` como porta única. Valem as mesmas regras de sempre: imutável, sem importar
React, "hoje" e dependências entram por parâmetro.

Em finanças: `Money` (ler e mostrar valor), `Ledger` (contas sobre os lançamentos, com filtros que se
encadeiam), `EverydayBudget` ("pode gastar hoje") e `Payables` (pendências a pagar e a receber).
Em pendências: `TaskList` (recortes por ciclo, backlog, etapa e filtro, que se encadeiam), `TaskDisplay`
(linha da lista e folha de detalhes) e a sua cópia de `Money`, que aceita só valor maior que zero.

Fica de fora a classe só de métodos estáticos (o Biome reprova) e a classe única com tudo (God object).

Esta é uma **divergência consciente** do padrão (§3.6, "função para cálculo e exibição").

Dois acertos de localização, que o ADR 0001 e o §11.3 ainda descrevem de outro jeito:

- Conceitos que o banco também precisa (`Task`, `Cycle`, `Envelope`, `Transaction`) moram em
  `shared/<área>/domain/` desde a fatia em que nascem, e não só quando a terceira tela precisar.
- `iso-date`, `day-labels` (nome de dia e de mês) e `Icon` ficam em `shared/`.

## Consequências

- Cada arquivo de domínio tem um papel e fica abaixo de ~300 linhas.
- O domínio de pendências também foi convertido (era `pages/tasks/domain.ts`, com funções), para o
  projeto não ficar com dois estilos. Os testes antigos foram mantidos, só trocando a forma de chamar.
- Na fatia 3, `Ledger` e `Money` (de finanças) subiram para `shared/finance/domain/`, porque a
  folha de concluir pendência (`shared/tasks/`) precisa deles e código de `shared/` não importa de
  `pages/`. Também subiu o `BottomSheet`, que passou a ter três usos.
- Na fatia 4, a tela Hoje é a segunda a usar `EverydayBudget`; por isso ela ficou com a sua cópia
  (com o painel e o ritmo, que só ela mostra), como manda o §6.3. A mesma coisa vale para a linha
  de pendência (`FocusTaskRow`) e para os textos de prazo (`TodayAgenda`), que repetem os de
  `pages/tasks/`. Na terceira tela, sobem para `shared/`.
- Na fatia 5, `Goal` e `GoalProgress` (guardado, porcentagem e prazo de uma meta) já nascem em
  `shared/goals/domain/`, porque a tela de metas e a tela Hoje ("Meta em foco") usam as duas desde o
  começo (§6.3: peça criada para várias telas nasce em `shared/`). Ficam em `pages/goals/domain/` só
  `GoalBoard` (abas e ordem) e `RequiredPace` (ritmo), e em `pages/today/domain/`, `FocusGoal`.
- Na fatia 6, `WeeklyPlan` (plano semanal do dia a dia) e `CycleReview` (revisão do ciclo) nascem em
  `shared/` porque Hoje e Histórico os usam desde o começo. O cálculo do gasto da semana existe
  duas vezes, em `pages/today/domain/WeeklySpending` e em `pages/history/domain/CycleHistory`
  (segunda tela copia, §6.3). A leitura que devolve ao backlog e anota o fechamento do ciclo
  (`shared/tasks/settle-ended-cycles.ts`) é função e não classe: faz entrada e saída, não é regra
  pura, e as três telas que leem pendências chamam a mesma.
- `Money` existe nas duas telas, com regras diferentes (finanças aceita zero; pendência não). Sobe
  para `shared/` na terceira tela (§6.3).
- **Quando rever:** se uma classe crescer a ponto de juntar dois assuntos, divide-se em duas.
