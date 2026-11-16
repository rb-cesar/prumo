# Prumo

App mobile único de pendências e finanças pessoais, 100% local (React + Vite + Capacitor + SQLite).
Decisões de stack e estrutura: `doc/adr/0001-stack-e-estrutura.md`. Protótipo visual: `prumo.html` (110 KB, ~30 mil tokens): **não abra, nem em parte, a menos que o dono peça.** Se pedir, leia só o trecho da tela em questão. A regra vale só para este arquivo local, não para o artefato publicado.
Valem também as regras do `CLAUDE.md` global (estrutura por pressão, regra pura, testes).

## Padrão de desenvolvimento

- O padrão **deste projeto** é a cópia em `doc/standards/`: entrada `README.md`, e valem
  `PADRAO-NUCLEO.md` e `PADRAO-FRONTEND.md`. **Não leia `C:\Dev` nem `D:\Dev`.**
- Não há `PADRAO-BACKEND.md` (não há servidor). Citações a §3.1–§3.5 e §4 apontam para ele: ignore, o texto
  local basta.
- Divergir da cópia é decisão registrada num ADR em `doc/adr/`.
- A fatia 0 (fundação) foi aprovada em 2026-11-15. O andamento está nas issues e nos milestones do GitHub (`rb-cesar/prumo`).

### Quando consultar

- **Peça no molde: não consulte.** Siga o código existente e o resumo abaixo.
- **Peça fora do molde, dúvida de onde algo fica, ou revisão final (§10.2 do núcleo): consulte só a seção
  necessária** (tabela "tarefa → seções" da entrada). Seção já lida na sessão não se lê de novo.
- **Onde cada peça fica:** a árvore exata do Prumo está em `PADRAO-FRONTEND.md` §11.3.
- **Peça** = arquivo ou pasta com papel próprio (página, `model.ts`, `domain`, classe, componente, hook
  compartilhado, adaptador de `data/` ou `infra/`, migração). **No molde** = existe no projeto uma peça do
  mesmo tipo que dá para abrir e copiar (outra página como `pages/tasks/`, outra classe como `Task`, outro
  adaptador como `data/tasks.ts`, um campo novo, um teste no formato dos vizinhos).
- **Fora do molde** = o primeiro de um tipo (primeiro `domain/` em pasta, primeiro hook em `shared/`,
  primeiro adaptador de `infra/`, primeira migração, componente que vira pasta, tipo que o resumo não
  cobre) ou uma peça que precisa fugir do formato (arquivo de regra acima de ~300 linhas).
- **Antes de existir uma tela de exemplo** (fatia 1 pronta), tudo é fora do molde: o padrão é a referência.
- **Na dúvida, trate como fora do molde** e leia só a seção daquela peça.

### Resumo do dia a dia

Resumo; se divergir de `doc/standards/`, vale a cópia. Entre parênteses, a seção do porquê.

- Layout e regra em arquivos diferentes, lado a lado: `*-page.tsx` só desenha; `model.ts` é o hook da
  tela; `domain.ts` (ou `domain/`) guarda a regra pura; `components/` é da tela (§6.1).
- A tela recebe dados por uma interface de `data/`; nunca há SQL na tela (§6.7).
- Domínio: classe imutável para conceito com identidade e regra (converte com `fromRecord` e `toRecord`);
  função para cálculo e exibição. Vira pasta `domain/` ao passar de ~300 linhas ou com dois grupos de
  regra que não se chamam (§3.6).
- Regra nasce na tela; a segunda tela copia; sobe para `shared/` na terceira. Peça criada para várias
  telas desde o começo nasce em `shared/`. Página nunca importa de outra página (§6.3).
- Sem `index.ts` geral: só dentro de componente ou domínio que virou pasta e precise de porta única.
  Tipo mora ao lado de quem o produz, com `import type` (§6.8, §6.9).
- Estado da tela é uma união `loading | error | ready`. Consultas são hooks do TanStack Query; as
  chaves ficam em `data/<recurso>.ts` (§6.6).
- Dinheiro em centavos (`amountInCents`), datas `AAAA-MM-DD`, ids gerados no aparelho, `updatedAt` e
  `deletedAt` em todo registro (§12.4).

## Regras de negócio

- `doc/business-rules/` é do dono do produto. **Não leia, liste nem busque nessa pasta por conta própria:
  só entre nela quando ele pedir** (ou apontar um arquivo). Só crie ou altere um arquivo ali se ele pedir.
- Se faltar a regra de negócio para o que está implementando, ou ela for ambígua, **pergunte a ele**;
  não vá procurar na pasta e não invente a regra.
