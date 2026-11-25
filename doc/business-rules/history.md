# Histórico e revisão do ciclo (fatia 6)

**Status: decidido pelo dono do produto em 2026-11-25** (as 9 sugestões do assistente foram aceitas, conferidas com o artefato publicado). O que veio do artefato está marcado **(artefato)**.

Convenções do app: dinheiro em centavos inteiros, datas `AAAA-MM-DD`, ids gerados no aparelho, exclusão em dois passos (fica guardada, não é apagada de verdade).

## Objetivo

Mostrar à pessoa como ela chegou até aqui: o que entrou, saiu e foi guardado mês a mês; como foram as semanas (ciclos); o que aconteceu dia a dia; e dar um lugar para ela escrever o que aprendeu ao fim de cada ciclo.

## Conceitos

- **Histórico:** a tela com três visões: **Meses**, **Ciclos** e **Cronologia (artefato)**. Tudo é calculado dos lançamentos e das pendências; só a revisão e a anotação do fim do ciclo são gravadas.
- **Mês fechado:** mês anterior ao de hoje. O mês de hoje é **parcial** e vem marcado com `*` **(artefato)**.
- **Ciclo fechado:** ciclo (domingo a sábado, BR-T06) anterior ao de hoje. O ciclo de hoje aparece como "em andamento" **(artefato)**.
- **Planejadas de um ciclo:** quantas pendências o ciclo tinha. Ao fim do ciclo, o que não foi concluído volta ao backlog (BR-T08) e perde a ligação com o ciclo; por isso o app **anota o total no fim do ciclo** (ver A decidir 2).
- **Gasto do dia a dia de um ciclo:** soma dos gastos dos envelopes do dia a dia (BR-F01, fora os fixos) cuja data cai de domingo a sábado do ciclo **(artefato)**.
- **Plano semanal do dia a dia:** quanto se pretende gastar por semana nos envelopes do dia a dia. No artefato é um número fixo de R$ 660 "fora moradia"; ver A decidir 3.
- **Revisão do ciclo:** três respostas curtas escritas pela pessoa sobre um ciclo: **O que funcionou?**, **O que atrapalhou?**, **O que muda no próximo ciclo? (artefato)**.

## Regras

### BR-H01 Visão Meses
- Mostra os **últimos 6 meses** com movimento, do mais antigo ao atual, a partir do primeiro mês que tem algum lançamento. Mês sem lançamento algum, no meio, aparece com zeros.
- Para cada mês: **Entrou** (soma das entradas), **Saiu** (soma dos gastos), **Guardou** (soma dos aportes) e **Taxa** = `guardou ÷ entrou`, em porcentagem arredondada **(artefato)**. Sem entrada no mês, a taxa é "—".
- Um gráfico de barras lado a lado (entrou e saiu) por mês, com o mês atual mais claro **(artefato)**, e uma tabela com os mesmos números **(artefato)**.
- O mês atual vem com nota "* Novembro até o dia 25" **(artefato)**.
- Sem nenhum lançamento, mostra o aviso de histórico vazio.

### BR-H02 Insights dos meses
Aparecem em "O que os números dizem" **(artefato)**. Só existem se houver **pelo menos 2 meses fechados** com entrada.
- **Taxa média:** "Você guarda X% da renda": a média das taxas dos meses fechados, e o pior mês fechado ("O pior foi out, com 7%") **(artefato)**.
- **Envelope que estoura:** se algum envelope do dia a dia passou do valor mensal em **3 ou mais** dos meses mostrados, mostra "<Envelope> passou do limite em N de M meses" e o limite atual. Se mais de um, o que estourou mais vezes **(artefato, que só olha o Lazer)**.

### BR-H03 Visão Ciclos
- Lista os ciclos do mais novo para o mais antigo, o de hoje primeiro com a marca "em andamento" **(artefato)**.
- Cada ciclo mostra o título pelas datas, sem número (BR-T06): "Ciclo 22 a 28 nov" (o artefato mostra o número, o app não).
- Duas barras por ciclo **(artefato)**: **Pendências** `concluídas/planejadas` (verde se todas) e **Dia a dia** (valor gasto, comparado ao plano semanal; amarela a partir de 85% do plano e vermelha acima dele, como BR-F04).
- Ciclos passados sem a anotação das planejadas (anteriores à fatia 6) **não aparecem**.
- Abaixo da lista: "Plano do dia a dia: R$ X por semana, fora moradia" **(artefato)**.

### BR-H04 Insights dos ciclos
Aparecem em "O que os ciclos dizem" **(artefato)**. Só existem se houver **pelo menos 3 ciclos fechados**.
- **Conclusão:** "Você concluiu X% do que planejou": concluídas ÷ planejadas dos ciclos fechados, e o melhor ciclo ("fechou N pendências") **(artefato)**.
- **Semana organizada, gasto menor:** se há ciclos fechados em que todas as pendências foram concluídas e outros em que não, e o gasto médio dos incompletos é **maior** que o dos completos, mostra a diferença **(artefato)**. Se a diferença não é positiva, o insight não aparece.

### BR-H05 Cronologia
- Pendências concluídas e lançamentos na mesma linha do tempo, do mais novo para o mais antigo, agrupados por dia **(artefato)**.
- Entram todos os lançamentos (gasto, entrada, aporte) e as pendências concluídas **sem** lançamento ligado. A pendência concluída que gerou lançamento aparece só pelo lançamento, com a marca "pendência concluída" **(artefato)**.
- Mostra os **30 eventos** mais recentes, com o botão **Ver mais**, que traz mais 30 por vez (o artefato mostra 18, sem "ver mais").

### BR-H06 Revisão do ciclo
- Perguntas **(artefato)**: "O que funcionou?", "O que atrapalhou?", "O que muda no próximo ciclo?". Em cima delas, um resumo do ciclo: pendências concluídas, gasto do dia a dia e guardado no mês **(artefato)**.
- É preciso responder **pelo menos uma**; as vazias ficam gravadas como "—" **(artefato)**. Mensagem se nenhuma: "Responda pelo menos uma pergunta para salvar a revisão." **(artefato)**
- A revisão é do **ciclo de hoje**, uma por ciclo. Depois de salva **não se edita nem se exclui** **(artefato)**.
- O botão **Fazer a revisão do ciclo** fica no cartão do ciclo da tela Hoje; salva, o cartão mostra "Revisão do ciclo salva." **(artefato)**.
- As revisões salvas aparecem em "Revisões", na visão Ciclos, da mais nova para a mais antiga, com o título "Revisão do ciclo 22 a 28 nov · sáb, 28 nov" **(artefato)**.

### BR-H08 Fechamento do ciclo (anotação das planejadas)
- Quando o app devolve ao backlog o que sobrou de ciclos que acabaram (BR-T08), ele anota, **uma vez por ciclo e sem nunca sobrescrever**, quantas pendências o ciclo tinha: todas as que estavam nele, concluídas ou não.
- Ciclos que já tinham acabado antes desta fatia ficam anotados como **desconhecidos** e não aparecem no histórico (decisão 9).
- Esse fechamento roda sempre que alguma tela lê as pendências (Hoje, Pendências e Histórico), para não depender de qual tela a pessoa abre primeiro.

### BR-H07 Cartão do ciclo na tela Hoje (acerto da fatia 4)
- Passa a mostrar também a barra "Gasto do dia a dia na semana: R$ X de R$ Y" (o plano semanal) **(artefato)**, com as cores de BR-H03.
- E o botão de revisão (BR-H06).

## Casos de borda

| Caso | Resultado esperado |
| --- | --- |
| App novo, sem lançamentos | Meses mostra o aviso de vazio; sem insights |
| Só o mês atual tem lançamentos | O gráfico mostra o mês atual (parcial), sem insights |
| Mês sem entrada | Taxa "—"; fora da média dos insights |
| Ciclo com 0 planejadas | Não aparece na lista de ciclos fechados |
| Todas as pendências do ciclo concluídas | Barra de pendências verde |
| Gasto do dia a dia de exatamente 85% do plano | Barra amarela; acima de 100%, vermelha |
| Pendência concluída com valor que gerou lançamento | Aparece uma vez só na cronologia, pelo lançamento |
| Revisão com uma resposta só | Salva; as outras duas ficam "—" |
| Revisão do ciclo que já foi revisado | O botão não aparece; mostra "Revisão do ciclo salva." |
| Ciclo cruza dois meses | O gasto do ciclo conta pela data de cada gasto |

## Fora desta fatia

- Editar ou excluir uma revisão; revisar um ciclo que já passou.
- Filtros e busca na cronologia.
- Exportar o histórico (fatia 8, backup).
- Metas no histórico.

## Decisões (todas aceitas como sugeridas)

1. **Meses mostrados:** os 6 últimos com movimento, a partir do primeiro mês com lançamento. *Sugestão: sim.* O artefato mostrava 6 meses de exemplo (jun a nov).
2. **Planejadas de um ciclo passado:** o app guardaria o total de pendências do ciclo no fim dele (na virada da semana), numa tabela pequena de fechamentos de ciclo. *Sugestão: sim.* Sem isso, o que não foi concluído volta ao backlog e o ciclo "esquece" que planejou aquilo. O histórico de ciclos só começa a partir desta fatia.
3. **Plano semanal do dia a dia:** em vez dos R$ 660 fixos do artefato, calcular `soma dos envelopes do dia a dia × 7 ÷ dias do mês` (com os seus R$ 2.850 de novembro dá R$ 665, quase os 660). Os envelopes e o mês usados são os de hoje e o do primeiro dia do ciclo. *Sugestão: sim.* Assim o plano acompanha os envelopes.
4. **Quando revisar:** só o ciclo de hoje, uma vez, sem editar. *Sugestão: sim, como no artefato.* A limitação: quem não revisa até sábado perde a chance. A alternativa é deixar revisar também o ciclo anterior, se não foi revisado.
5. **Insight de envelope:** generalizar o "Lazer passou do limite" para o envelope do dia a dia que mais estourou (3 ou mais meses). *Sugestão: generalizar.* O artefato só olhava o Lazer.
6. **Mínimo de dados para insights:** 2 meses fechados nos meses e 3 ciclos fechados nos ciclos; abaixo disso, a seção não aparece. *Sugestão: sim.*
7. **Cronologia:** 30 eventos com "Ver mais", em vez dos 18 fixos. *Sugestão: sim.*
8. **Cartão do ciclo em Hoje:** receber já nesta fatia a barra do gasto semanal e o botão de revisão (os dois que ficaram de fora na fatia 4). *Sugestão: sim.*
9. **Ciclo sem anotação (anterior a esta fatia):** não aparecer no histórico, em vez de aparecer só com as concluídas. *Sugestão: não aparecer.*
