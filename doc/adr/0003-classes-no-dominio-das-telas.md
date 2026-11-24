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

Fica de fora a classe só de métodos estáticos (o Biome reprova) e a classe única com tudo (God object).

Esta é uma **divergência consciente** do padrão (§3.6, "função para cálculo e exibição").

Dois acertos de localização, que o ADR 0001 e o §11.3 ainda descrevem de outro jeito:

- Conceitos que o banco também precisa (`Task`, `Cycle`, `Envelope`, `Transaction`) moram em
  `shared/<área>/domain/` desde a fatia em que nascem, e não só quando a terceira tela precisar.
- `iso-date`, `day-labels` (nome de dia e de mês) e `Icon` ficam em `shared/`.

## Consequências

- Cada arquivo de domínio tem um papel e fica abaixo de ~300 linhas.
- O domínio de pendências (`pages/tasks/domain.ts`) continua com funções por enquanto. Passa para
  classes quando for mexido, para não reescrever o que está pronto.
- **Quando rever:** se uma classe crescer a ponto de juntar dois assuntos, divide-se em duas.
