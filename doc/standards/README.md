# Padrão de Desenvolvimento — Guia de leitura

> **Cópia do projeto** (2026-11-13), onde o índice se chama `README.md` (na pasta central é `PADRAO-DESENVOLVIMENTO.md`): vale esta, não `C:\Dev`; mudar ou divergir dela vira ADR (`doc/adr/`). `PADRAO-BACKEND.md` não foi copiado (o Prumo não tem servidor).

> Como eu construo qualquer aplicação nova: **arquitetura simples e modular, código
> legível, desenvolvimento orientado a testes automatizados.**
>
> O padrão é **independente de stack** e **independente de tamanho**. O mesmo padrão
> serve para um CRUD de uma tela e para uma plataforma social com chat, salas privadas,
> chamadas em grupo e feed — porque a plataforma não usa uma arquitetura diferente:
> ela usa **mais peças do mesmo formato**.
>
> As bibliotecas escolhidas estão na §9 e são substituíveis. Os exemplos de código usam TypeScript
> e React, e citam Zod e React Query onde mostram um caso concreto. A arquitetura (§2–§7) não
> muda quando a stack muda.

> **Este arquivo é um guia.** Ele **não contém regras de código**: só diz o que são os outros arquivos do
> padrão e **o que ler e o que não ler** em cada tarefa. As regras estão nos outros arquivos.

---

## 1. Como usar

**App novo:** comece no **Nível 1** (§5), sempre. Leia §2, use o checklist §10.1 e, no lado que
for construir, o arquivo do back-end ou do front-end. Nunca comece no Nível 3 "porque o app vai
crescer": o Nível 3 é o que o Nível 1 vira sozinho, sem reescrita.

**App existente:** aplique por módulo, na ordem do §10.2. Não pare para refatorar tudo.

**Que arquivos ler:** o `NUCLEO` entra sempre. Some o `FRONTEND` se há tela (inclusive app local, sem
servidor), o `BACKEND` se há servidor, e os dois se é API + site. Não leia o resto "por garantia":
cada arquivo extra é contexto gasto sem retorno.

**Toda decisão de estrutura traz o porquê e o gatilho.** Onde há um arquivo ao lado de uma pasta,
ou uma regra num lugar e não em outro, o motivo está escrito (em "Por quê" ou na tabela de
gatilhos). Se você precisa adivinhar o motivo de uma estrutura, falta registro: corrija o
documento (§8.5).

**A regra que rege o padrão inteiro:**

> **Estrutura se adiciona por pressão, nunca por antecipação.**
> Toda peça deste padrão tem um gatilho que diz *quando* ela passa a existir.
> Criar a peça antes do gatilho é a verbosidade que quero evitar; criar depois do
> problema aparecer é retrabalho barato.

---

## Onde está cada seção

O padrão está dividido em arquivos. Os números das seções são os do documento original, para que
"§6.7" continue apontando para o mesmo lugar (por isso há "buracos" em cada arquivo).

| Arquivo | Seções |
|---|---|
| `README.md` (entrada) | §1 como usar · mapa · tarefa → seções |
| `PADRAO-NUCLEO.md` | §2 regras · §3.6 domínio · §5 níveis · §7.1–7.5 testes · §8 convenções · §9 ferramentas · §10 checklists |
| `PADRAO-BACKEND.md` | §3 módulo (3.1–3.5, com o contrato) · §4 portas e adaptadores · §11.1–11.2 ilustrações |
| `PADRAO-FRONTEND.md` | §6 front-end · §7.6 testes de tela · §11.3 ilustração · §12 app local |

---

## Como ler só o necessário

Nenhum arquivo precisa ser lido inteiro. Cada seção abre com um cabeçalho numerado (`### 6.7 ...`),
então dá para achar a seção pelo cabeçalho e ler só ela: liste os cabeçalhos
(`grep -n "^#\{2,3\} "` no arquivo) e leia o trecho entre o cabeçalho que interessa e o seguinte.

**Tarefa → seções a ler** (os números são os do mapa acima):

| Vou... | Leia |
|---|---|
| Começar um projeto | `NUCLEO` §5 (nível), §10.1 (checklist), §2 (regras), §8.4 (nomes); depois o lado que for construir |
| Criar uma tela | `FRONTEND` §6.1, §6.2, §6.4, §6.5, §6.6 |
| Criar um componente | `FRONTEND` §6.3, §6.4, §6.5 |
| Buscar ou gravar dado na tela | `FRONTEND` §6.6, §6.7 (e §12.3 se o app é local) |
| Escrever regra de negócio ou uma classe de domínio | `NUCLEO` §2 (R1, R5), §3.6 |
| Criar um módulo de API | `BACKEND` §3.1, §3.2, §3.3 |
| Mexer em middleware, autenticação, log ou tratamento de erro | `BACKEND` §3.4 |
| Ligar uma integração externa, WebSocket, job ou evento | `BACKEND` §4.1, §4.2, §4.3 (§4.4 para um caso novo) |
| Definir ou mudar o contrato API ↔ site | `BACKEND` §3.5 |
| Escrever um teste | `NUCLEO` §7.2, §7.4 (e §7.5 se usa banco); `FRONTEND` §7.6 se é de tela |
| Decidir onde um tipo, import ou estado mora no front-end | `FRONTEND` §6.8, §6.9, §6.10, §6.11 |
| Revisar uma entrega | `NUCLEO` §10.2, §10.3 |
| Nomear algo ou decidir estilo | `NUCLEO` §8 |
| Registrar uma decisão (ADR, README) | `NUCLEO` §8.5 |
| Escolher uma biblioteca | `NUCLEO` §9 |
| Saber onde cada peça do Prumo fica (a árvore exata) | `FRONTEND` §11.3 |
| Construir um app local, sem servidor | `FRONTEND` §12 inteiro, mais as seções da tela que for fazer |

Esta tabela é um **atalho**, não uma regra: se a tarefa tocar em algo que ela não cobre, vale o mapa.

---

## Manutenção

Os arquivos existem em `C:\Dev` e `D:\Dev` e devem ficar iguais (§8.5). O documento único anterior à
divisão está congelado em `PADRAO-DESENVOLVIMENTO.antes-da-divisao.md`: serve de comparação e não deve
ser editado; é nele que está a história de como se chegou às decisões.

**Por que está dividido:** quem mexia numa tela lia também as ~440 linhas de back-end, e vice-versa,
gastando contexto com texto que não muda a decisão em curso. O `NUCLEO` existe porque há conteúdo que
os dois lados usam e que não pode ficar duplicado (regras, domínio, níveis, testes, convenções,
ferramentas, checklists). Se um arquivo passar de umas 700 linhas, ou uma seção só for lida por um tipo
de projeto, ela sai para o arquivo daquele tipo. Fotografia dos projetos que originaram o padrão:
`AUDITORIA-PROJETOS-2026-08.md` (só na pasta central).
