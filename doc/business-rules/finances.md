# Regras de finanças (fatia 2)

**Status: APROVADO pelo dono do produto em 2026-11-23** (conferido com o artefato publicado).

Convenções do app: dinheiro em centavos inteiros, datas `AAAA-MM-DD`, ids gerados no aparelho, exclusão em dois passos (fica guardada, não é apagada de verdade).

## Conceitos

- **Envelope:** uma caixinha de dinheiro para uma categoria de gasto (Mercado, Transporte, Lazer, Moradia). Tem nome, valor mensal e é **fixo** ou **do dia a dia**.
- **Lançamento:** um movimento de dinheiro: **gasto**, **entrada** ou **aporte** (dinheiro guardado numa meta).
- **Mês:** do dia 1 ao último dia do calendário.

## Regras

### BR-F01 Envelope
- Tem nome (obrigatório) e valor mensal em centavos (maior que zero).
- É **fixo** (contas que não mudam: aluguel) ou **do dia a dia** (mercado, lazer, transporte).
- O app já vem com os envelopes do artefato: Moradia (fixo, R$ 2.200), Mercado (R$ 1.100), Transporte (R$ 450), Lazer (R$ 400), Saúde (R$ 300), Assinaturas (R$ 150) e Restaurantes (R$ 450). Os valores são de exemplo.
- Criar, renomear, mudar o valor e arquivar envelopes **não é desta fatia**: é uma fatia própria ("gerenciar envelopes"), logo depois, antes do uso de verdade.

### BR-F02 Renovação mensal
- A cada mês o envelope começa com o valor mensal cheio.
- A sobra do mês anterior some, e o que estourou não é descontado do mês seguinte. O dinheiro que sobrou continua no saldo em conta.

### BR-F03 Lançamento
- Tem valor (centavos, maior que zero), data, tipo e uma descrição curta.
- **Gasto** exige um envelope. **Entrada** e **aporte** nunca têm envelope. O aporte só é criado pela tela de metas (fatia 5), mas o tipo já existe nesta fatia.
- No botão **+**, o gasto pede valor, descrição e envelope; a receita pede valor e descrição. A data é **sempre a de hoje**, sem campo para escolher.
- Tocar na linha de um lançamento abre uma folha com a opção **Excluir lançamento**, em dois passos (o registro fica guardado). Editar um lançamento **não é desta fatia**: se errou, exclua e lance de novo.
- Um lançamento que veio de uma pendência concluída (fatia 3) mostra a marca "de uma pendência".

### BR-F04 Situação do envelope (calculada, nunca gravada)
- `gasto` = soma dos gastos do envelope cuja data cai no mês corrente.
- `restante` = valor mensal − gasto.
- Três situações: **ok**; **perto do limite** (gasto a partir de 85% do valor); **estourado** (gasto **maior** que o valor).
- Texto mostrado: "Restam R$ X" ou "Estourou R$ X" (sempre número positivo).
- Gastar exatamente o valor deixa restante R$ 0,00, em "perto do limite" e **não** estourado.

### BR-F05 Totais do mês e saldo
- **Entrou** = soma das entradas do mês. **Saiu** = soma dos gastos do mês. **Guardado** = soma dos aportes do mês.
- **Saldo em conta** = saldo inicial + todas as entradas − todos os gastos − todos os aportes. Não reinicia a cada mês. É calculado, nunca gravado.
- **Saldo inicial:** você informa uma vez, numa folha com um campo que aparece na primeira vez que abre Finanças. Até informar, vale R$ 0,00.

### BR-F06 "Pode gastar hoje" (só envelopes do dia a dia, somados)
- Considera **apenas** os envelopes do dia a dia, todos juntos (um estouro num envelope reduz o que sobra nos outros).
- `restante do dia a dia` = soma dos valores dos envelopes do dia a dia − soma dos gastos deles no mês.
- `pode gastar hoje` = restante do dia a dia ÷ dias que faltam no mês, **contando hoje**, arredondado **para baixo** em centavos.
- O gasto feito hoje já está descontado.
- Se o restante for zero ou negativo, o valor é R$ 0,00 e a tela avisa que o dia a dia passou do orçamento do mês. Nunca mostra valor negativo.
- Envelopes fixos **não** entram nessa conta.
- A regra é implementada e testada nesta fatia, mas o valor aparece na tela Hoje (fatia 4), como no artefato.

### BR-F07 Ritmo do mês
- `gasto do dia a dia` ÷ `orçamento do dia a dia` (percentual gasto) é comparado com `dia de hoje` ÷ `dias do mês` (percentual do mês que passou).
- Gasto maior que o mês decorrido: "à frente do ritmo". Caso contrário: "no ritmo". Aparece na tela Hoje e será implementada na fatia 4.

### BR-F08 Último dia do mês
- No último dia, os dias que faltam são 1: o valor é o restante inteiro.

### BR-F09 Lista de lançamentos
- Agrupada por dia, do mais novo para o mais antigo.
- Tocar num envelope filtra a lista só por ele; tocar de novo limpa o filtro.

### BR-F10 A pagar e a receber
- A tela de finanças mostra as pendências abertas que têm valor, ordenadas por prazo (sem prazo por último). Elas vêm da regra de pendências; aqui só aparecem.

## Onde o app real diverge do artefato (de propósito)

- O artefato soma **todos** os gastos de um envelope, sem olhar o mês (só funciona porque os dados de exemplo são todos de novembro). No app, o gasto do envelope conta **só o mês corrente** (BR-F04).
- O artefato divide com casas decimais soltas. No app, o dinheiro é em centavos e a divisão arredonda para baixo (BR-F06).
- O artefato calcula o saldo a partir de um valor fixo no começo do mês. No app, o saldo vem do saldo inicial e de todos os lançamentos (BR-F05).

## Casos de borda

| Caso | Resultado esperado |
| --- | --- |
| Último dia do mês | Divide por 1 |
| Fevereiro (28 ou 29 dias) | Usa os dias reais do mês |
| Restante R$ 100,00 e 3 dias | R$ 33,33 por dia (arredonda para baixo) |
| Restante R$ 0,01 e 5 dias | R$ 0,00 |
| Gasto de outro mês | Não entra nas contas deste mês |
| Gasto igual ao valor do envelope | Restante R$ 0,00, perto do limite, sem estouro |
| Gasto maior que o valor | "Estourou R$ X"; reduz o restante do dia a dia |
| Gasto em envelope fixo | Não muda o "pode gastar hoje" |
| Excluir um gasto | O restante volta a subir |
| Nenhum envelope do dia a dia | "Pode gastar hoje" R$ 0,00 |
| Saldo inicial ainda não informado | Saldo em conta calculado a partir de R$ 0,00 |

## Fora desta fatia

- Gerenciar envelopes (criar, renomear, mudar valor, arquivar) e editar lançamento.
- Metas e aportes (fatia 5) e histórico por mês (fatia 6).
- Concluir pendência com valor gerando lançamento (fatia 3).
- A tela Hoje com o painel do "pode gastar hoje", o ritmo e o plano semanal (fatia 4).
- Contas, cartão de crédito, parcelamento, lançamento recorrente, moeda estrangeira e backup.
