# Metas (fatia 5)

**Status: decidido pelo dono do produto em 2026-11-24** (sugestões do assistente aceitas, conferidas com o artefato publicado). O que veio do artefato está marcado **(artefato)**.

Convenções do app: dinheiro em centavos inteiros, datas `AAAA-MM-DD`, ids gerados no aparelho, exclusão em dois passos (fica guardada, não é apagada de verdade).

## Objetivo

A pessoa define quanto quer juntar e até quando, registra o que guarda e vê o progresso e quanto precisa guardar por semana ou por mês para chegar no prazo.

## Conceitos

- **Meta (de guardar):** tem título, **valor-alvo** e prazo. Nesta fatia só existe esse tipo.
- **Horizonte:** **curto prazo** (prazo a até 90 dias de hoje, os "3 meses") ou **longo prazo** (mais que isso). É calculado pelo prazo, nunca escolhido nem gravado: uma meta de longo prazo vira de curto sozinha com o tempo.
- **Valor inicial:** quanto a pessoa já tinha guardado quando criou a meta. Opcional, zero por padrão.
- **Aporte:** dinheiro guardado numa meta. É um lançamento do tipo **aporte** (BR-F03), ligado à meta.

## Regras

### BR-M01 Meta
- Título obrigatório (não pode ser vazio nem só espaços), valor-alvo em centavos (maior que zero) e prazo (data).
- O prazo pode ser hoje ou depois. Não se cria meta com prazo no passado.
- Valor inicial opcional: zero ou maior. Pode ser maior que o alvo.
- O app **começa sem metas**: nenhuma meta de exemplo.

### BR-M02 Guardado e progresso
- `guardado` = valor inicial + soma dos aportes da meta. É calculado, nunca gravado.
- `progresso` = `guardado ÷ valor-alvo`. Mostra "Guardado R$ X de R$ Y" **(artefato)**.
- A porcentagem fica entre 0% e 100%, arredondada **(artefato)**. A barra fica verde ao chegar em 100% **(artefato)**.
- Com `guardado` maior ou igual ao alvo a meta está **concluída**: continua na lista, com 100% e um selo "Concluída". Não tem botão de concluir nem arquivo; o histórico (fatia 6) mostra depois.

### BR-M03 Aporte
- Cria um lançamento do tipo **aporte**, com a data de **hoje**, ligado à meta. A descrição é "Aporte: <título da meta>" **(artefato)**.
- O valor é digitado (maior que zero). Há atalhos de **+ R$ 50**, **+ R$ 100** e **+ R$ 200** que preenchem o campo **(artefato)**.
- O aporte **sai do saldo em conta** e soma em "Guardado" do mês (BR-F05). Pode deixar o saldo negativo, como um gasto.
- Uma meta concluída ainda aceita aporte.
- Excluir um aporte (pelo Financeiro, BR-F03) devolve o valor ao saldo e diminui o guardado da meta.

### BR-M04 Ritmo necessário
- `falta` = valor-alvo − guardado (nunca negativo). Se `falta` é zero, **não mostra ritmo** **(artefato)**.
- `dias restantes` = dias de hoje até o prazo (zero se hoje ou vencido).
- **Menos de 60 dias:** o ritmo é **por semana**: `falta ÷ semanas restantes`, com `semanas restantes` = `dias restantes ÷ 7`, no mínimo 1 **(artefato)**.
- **60 dias ou mais:** o ritmo é **por mês**: `falta ÷ meses restantes`, com `meses restantes` = `dias restantes ÷ 30,4` arredondado para cima, no mínimo 1 **(artefato)**. Exemplo: 365 dias são 13 meses.
- O valor mostrado é arredondado **para cima**, em reais inteiros, para que seguir o ritmo chegue ao alvo. O artefato arredonda para o real mais próximo; o app diverge de propósito.

### BR-M05 Prazo
- Mostra "até dom, 15 nov" e quanto falta: "vence hoje", "faltam N dias" (menos de 60) ou "faltam N meses" (60 dias ou mais, `dias ÷ 30,4` arredondado) ou "prazo vencido" **(artefato)**.
- Meta vencida e não concluída continua na lista, marcada como "prazo vencido". Não some sozinha.

### BR-M06 Lista de metas
- Duas abas: **Curto prazo** (até 90 dias) e **Longo prazo**. Dentro de cada, ordem pelo prazo mais próximo **(artefato)**.
- A aba que abre é a do curto prazo; se não houver meta de curto prazo e houver de longo, abre a do longo.
- Cada meta é um cartão com título, prazo, porcentagem e as linhas "Guardado" e "Ritmo necessário". Tocar no título abre o cartão e mostra o campo de aporte **(artefato)**.
- Há um botão **Nova meta** no fim da lista **(artefato)**.
- Sem metas na aba, mostra o aviso de lista vazia.

### BR-M07 Excluir meta
- Tocar em "Excluir meta" no cartão aberto pede confirmação em dois passos ("Excluir meta", depois "Confirmar exclusão"). O registro fica guardado.
- Os aportes já feitos **continuam** como lançamentos no financeiro, com a descrição de quando foram feitos ("Aporte: Viagem"): o dinheiro já saiu do saldo. Eles só deixam de somar em alguma meta.

### BR-M08 Meta em foco (tela Hoje)
- É a meta **não concluída com o prazo mais próximo**, mesmo se vencida. Não há marcador manual de foco.
- Mostra título, porcentagem, "R$ X de R$ Y" e o prazo. Sem meta não concluída, mostra "Nenhuma meta ainda" (ou, se todas estão concluídas, "Todas as metas concluídas").

## Casos de borda

| Caso | Resultado esperado |
| --- | --- |
| Guardado igual ao alvo | 100%, barra verde, "Concluída", sem ritmo |
| Guardado maior que o alvo | 100%, "Concluída", sem ritmo |
| Prazo daqui a 30 dias, falta R$ 300,00 | R$ 70 por semana (300 ÷ 4,29, para cima) |
| Prazo daqui a 304 dias, falta R$ 10.000,00 | R$ 1.000 por mês (10 meses) |
| Prazo daqui a 365 dias, falta R$ 12.000,00 | R$ 924 por mês (13 meses, arredondado para cima) |
| Prazo hoje, falta R$ 200,00 | R$ 200 por semana (mínimo de 1 semana) |
| Prazo vencido e não concluída | "prazo vencido", ritmo por semana com 1 semana |
| Valor inicial maior que zero | Conta no guardado e no progresso, mas não gera lançamento nem mexe no saldo |
| Aporte maior que o saldo em conta | Permitido: o saldo pode ficar negativo |
| Excluir a meta | Os aportes continuam no financeiro, sem meta |
| Prazo daqui a 90 dias | Curto prazo; a partir de 91 dias, longo prazo |

## Fora desta fatia

- **Metas de passos** e ligar pendência a meta: fatia própria, depois desta. O artefato mostra o desenho (campo "Ajuda em qual meta?" e linha "Passos concluídos").
- Editar uma meta (título, alvo, prazo): se errou, exclua e crie de novo. O aporte já feito não acompanha a meta nova.
- Meta do mês ("Guardar R$ 1.500 em novembro"): não é meta. O "Guardado no mês" da tela Hoje já cobre.
- Histórico das metas (fatia 6) e lembretes de aporte (fatia 7).
