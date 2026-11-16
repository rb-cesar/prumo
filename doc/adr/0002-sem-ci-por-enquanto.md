# 0002 — Sem CI por enquanto

- **Data:** 2026-11-16
- **Status:** aceita
- **Referências:** `doc/standards/PADRAO-NUCLEO.md` §5, §9 e §10.1 (CI desde o primeiro commit)

## Contexto

O padrão manda ter CI desde o primeiro commit: um robô que roda `lint`, `typecheck` e `test` a cada
envio ao GitHub. O arquivo do workflow ficou pronto na fatia 0, mas o GitHub recusa enviá-lo sem a
permissão `workflow` no token. O projeto tem uma única pessoa trabalhando, que já roda `pnpm check` na
mão, e o que se quer do ponto de vista de qualidade são os testes automatizados, que já existem.

## Decisão

**Não ter CI por enquanto.** A verificação continua sendo `pnpm check` (lint, tipos e testes), rodado
antes de cada commit e de cada pull request.

Esta é uma **divergência consciente** do padrão (§5, §9 e §10.1).

## Consequências

- Nada impede o envio de código que quebre o `pnpm check`; quem garante é quem envia.
- Uma configuração a menos agora (a permissão `workflow` do token do GitHub).
- O arquivo do workflow está guardado no commit `d924f10`, na branch local `fatia-0-com-ci`, pronto
  para ser enviado.
- **Quando rever:** ao ter mais de uma pessoa no projeto, ou se um envio quebrado passar sem ser
  notado. Aí cria-se um ADR novo reativando o CI.
