# Prumo

App mobile único de pendências e finanças pessoais, 100% local (React + Vite + Capacitor + SQLite).
Este arquivo é o **guia geral do projeto**: diz o que existe e onde fica. As instruções para a IA estão
no `CLAUDE.md`.

## Telas

Capturas do app no Android, com dados de exemplo.

<table>
  <tr>
    <td align="center"><img src="doc/screenshots/01-hoje.png" width="170" alt="Hoje: quanto posso gastar, pendências do dia e ciclo"><br><sub><b>Hoje</b><br>quanto posso gastar</sub></td>
    <td align="center"><img src="doc/screenshots/02-hoje-continuacao.png" width="170" alt="Hoje: ciclo, próximos 7 dias e meta em foco"><br><sub><b>Hoje, abaixo</b><br>próximos 7 dias e meta em foco</sub></td>
    <td align="center"><img src="doc/screenshots/03-pendencias.png" width="170" alt="Pendências do ciclo semanal em A fazer, Fazendo e Feito"><br><sub><b>Pendências</b><br>ciclo semanal</sub></td>
    <td align="center"><img src="doc/screenshots/04-pendencias-backlog.png" width="170" alt="Backlog de pendências"><br><sub><b>Backlog</b><br>o que ainda não tem semana</sub></td>
    <td align="center"><img src="doc/screenshots/05-financas.png" width="170" alt="Finanças: envelopes do mês e saldo em conta"><br><sub><b>Finanças</b><br>envelopes do mês</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="doc/screenshots/06-financas-lancamentos.png" width="170" alt="Finanças: a pagar, a receber e lançamentos"><br><sub><b>Lançamentos</b><br>agrupados por dia</sub></td>
    <td align="center"><img src="doc/screenshots/07-metas-curto-prazo.png" width="170" alt="Metas de curto prazo com progresso e ritmo necessário"><br><sub><b>Metas</b><br>curto prazo</sub></td>
    <td align="center"><img src="doc/screenshots/08-metas-longo-prazo.png" width="170" alt="Metas de longo prazo"><br><sub><b>Metas</b><br>longo prazo</sub></td>
    <td align="center"><img src="doc/screenshots/09-meta-aporte.png" width="170" alt="Aporte numa meta"><br><sub><b>Aporte</b><br>guardar numa meta</sub></td>
    <td align="center"><img src="doc/screenshots/10-nova-meta.png" width="170" alt="Folha para criar uma nova meta"><br><sub><b>Nova meta</b><br>valor, prazo e quanto já tem</sub></td>
  </tr>
</table>

## Mapa do projeto

| Onde | O que é |
|---|---|
| `src/` | o código; a árvore esperada está em `doc/standards/PADRAO-FRONTEND.md` §11.3 |
| `doc/adr/` | decisões de stack e estrutura (o `0001` é o ponto de partida) |
| `doc/standards/` | o padrão de desenvolvimento; o guia está em `doc/standards/README.md` |
| `doc/business-rules/` | regras de negócio, do dono do produto |
| `prumo.html` | protótipo visual das telas, só referência |
| `CLAUDE.md` | instruções para a IA |

## Como rodar e testar

Precisa de Node 24 e pnpm 10.

```bash
pnpm install
pnpm dev          # abre o app no navegador
pnpm check        # lint + tipos + testes
pnpm test:watch   # testes em modo contínuo
pnpm build        # gera dist/
```

### Android

Precisa do JDK 21 (`JAVA_HOME`) e do Android SDK (`ANDROID_HOME`, com a plataforma 36). O Capacitor 8
gera um projeto que exige Java 21; o JDK 17 não serve.

```bash
pnpm build && pnpm exec cap sync android   # copia dist/ para o projeto Android
cd android && ./gradlew assembleDebug      # gera o APK de teste
```
