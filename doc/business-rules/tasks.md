# Pendências

- **Status:** rascunho completo, aguardando aprovação do dono do produto
- **Decidido em:** 2026-11-16
- **Origem:** protótipo (`prumo.html`) e respostas do dono do produto. O que veio de resposta está marcado com **(decisão)**.

## Objetivo

A pessoa anota o que precisa fazer, organiza a semana num ciclo e acompanha o que falta, sem perder prazo.

## O que uma pendência tem

| Campo | Regra |
|---|---|
| Título | obrigatório; não pode ser vazio nem só espaços |
| Etapa | A fazer, Fazendo ou Feito; nasce em A fazer |
| Prioridade | Alta, Média ou Baixa; nasce Média |
| Prazo | opcional; é em dia, sem hora |
| Onde está | no ciclo atual ou no backlog; nunca nos dois |
| Valor | opcional; se existir, é maior que zero |
| Sentido do valor | obrigatório quando há valor: a pagar ou a receber |
| Envelope | só para valor a pagar |
| Concluída em | o dia em que foi para Feito; fica vazio fora de Feito |

## Regras

- **BR-T01 — Criar.** Uma pendência nova exige título. Ao criar, a pessoa escolhe se ela entra no ciclo atual ou no backlog.
- **BR-T02 — Etapas.** A mudança entre A fazer, Fazendo e Feito é livre, em qualquer direção.
- **BR-T03 — Concluir e reabrir.** Tocar no círculo de uma pendência aberta a conclui. Tocar no círculo de uma feita a reabre em A fazer. Ao sair de Feito, a data de conclusão é apagada.
- **BR-T04 — Atrasada.** Uma pendência está atrasada quando tem prazo anterior a hoje e não está em Feito. O atraso é contado em dias ("Atrasada 2 dias").
- **BR-T05 — Ordem na lista.** Primeiro por prazo, do mais próximo ao mais distante; as sem prazo vão por último. No empate, por prioridade: Alta, Média, Baixa.
- **BR-T06 — Ciclo.** O ciclo é uma semana, de **domingo a sábado (decisão)**. Ele é identificado **só pelas datas, sem número (decisão)**, por exemplo "8 a 14 nov". Só o ciclo atual recebe pendências.
- **BR-T07 — Backlog.** O backlog guarda o que ainda não tem semana marcada. "Puxar" leva uma pendência do backlog ao ciclo atual; "Mover para o backlog" faz o caminho inverso.
- **BR-T08 — Fim do ciclo.** Quando o ciclo termina, as pendências **não concluídas voltam ao backlog (decisão)**, **sozinhas, na virada da semana (decisão)**: na próxima vez que o app é aberto depois do sábado. As que estavam em Fazendo **voltam para A fazer (decisão)**, porque a etapa Fazendo só existe dentro de um ciclo. As concluídas ficam no ciclo em que foram feitas, para o histórico.
- **BR-T09 — Excluir.** Excluir pede uma confirmação em dois passos ("Excluir pendência", depois "Confirmar exclusão").
- **BR-T10 — Filtros.** A lista pode ser filtrada por "Todas", "Com valor" e "Prioridade alta".

## Casos de borda

| Situação | Resultado |
|---|---|
| Prazo é hoje, etapa A fazer | não está atrasada; mostra "Hoje" |
| Prazo foi ontem, etapa Fazendo | atrasada 1 dia |
| Prazo foi ontem, etapa Feito | não está atrasada |
| Sem prazo | nunca fica atrasada; vai para o fim da lista |
| Mesmo prazo, prioridades Alta e Baixa | a Alta vem antes |
| Título só com espaços | recusada: "Escreva o que precisa ser feito." |
| Valor "abc" ou zero | recusado: "O valor não parece certo. Use um formato como 120,50." |
| Reabrir uma feita | volta para A fazer e perde a data de conclusão |
| Fim do ciclo, pendência em Fazendo | volta ao backlog em A fazer |
| App ficou fechado por duas semanas | ao abrir, tudo o que não foi concluído nos ciclos passados volta ao backlog |

## Fora desta regra

- Lançar o valor no financeiro ao concluir, e remover ao reabrir: é a regra de "concluir com valor" (fatia 3).
- Ligar a pendência a uma meta (fatia 5).
- O que aparece em "Para hoje" e "Próximos 7 dias" (fatia 4).
- A revisão do ciclo (fatia 6).
