import { useState } from "react";
import { Icon } from "../../shared/icon";
import { useServices } from "../../shared/services";
import { AddTransactionSheet } from "./components/add-transaction-sheet";
import { EnvelopeRow } from "./components/envelope-row";
import { OpeningBalanceSheet } from "./components/opening-balance-sheet";
import { PayableRow } from "./components/payable-row";
import { TransactionDetailSheet } from "./components/transaction-detail-sheet";
import { TransactionRow } from "./components/transaction-row";
import { useMoneyModel } from "./model";

type OpenSheet =
  | { kind: "add" }
  | { kind: "detail"; transactionId: string }
  | { kind: "opening-balance" }
  | null;

export function MoneyPage() {
  const model = useMoneyModel(useServices());
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const [hasDismissedBalancePrompt, setHasDismissedBalancePrompt] = useState(false);
  const { state, actions, controls } = model;

  const mustAskOpeningBalance =
    state.status === "ready" &&
    state.needsOpeningBalance &&
    !hasDismissedBalancePrompt &&
    openSheet === null;
  const isOpeningBalanceSheetOpen = openSheet?.kind === "opening-balance" || mustAskOpeningBalance;
  const detailRow =
    openSheet?.kind === "detail" ? model.findTransactionRow(openSheet.transactionId) : undefined;

  function closeSheet() {
    setOpenSheet(null);
    setHasDismissedBalancePrompt(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col">
      <header className="app-header">
        <div>
          <div className="app-eyebrow">
            <span>Envelopes</span>
          </div>
          <h1 className="app-title">Finanças</h1>
          <p className="app-subtitle">{state.status === "ready" ? state.monthText : " "}</p>
        </div>
      </header>

      <main className="flex flex-col gap-section px-4 pb-40 pt-1.5">
        {state.status === "loading" ? <p className="text-small text-ink-2">Carregando…</p> : null}

        {state.status === "error" ? (
          <div className="card">
            <div className="empty">
              <strong>Não foi possível carregar as finanças</strong>
              Feche e abra o app de novo.
            </div>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <>
            <section className="stats" aria-label="Resumo do mês">
              <div className="stat">
                <span className="stat-label">Entrou</span>
                <span className="stat-value text-pos-ink">{state.summary.incomeText}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Saiu</span>
                <span className="stat-value">{state.summary.expenseText}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Guardado</span>
                <span className="stat-value text-steel-ink">{state.summary.savedText}</span>
              </div>
            </section>
            <p className="small muted">
              Saldo em conta hoje:{" "}
              <strong className="numeric text-ink">{state.summary.accountBalanceText}</strong>{" "}
              <button
                className="link"
                type="button"
                onClick={() => setOpenSheet({ kind: "opening-balance" })}
              >
                {state.needsOpeningBalance ? "informar saldo inicial" : "ajustar saldo inicial"}
              </button>
            </p>

            <section>
              <h2 className="section-title">
                <span>Envelopes de {state.monthName}</span>
              </h2>
              <div className="card flush list">
                {state.envelopes.map((row) => (
                  <EnvelopeRow
                    key={row.id}
                    row={row}
                    isSelected={state.envelopeFilter?.id === row.id}
                    onToggle={controls.toggleEnvelopeFilter}
                  />
                ))}
              </div>
            </section>

            <section>
              <h2 className="section-title">
                <span>
                  A pagar e a receber <span className="count">{state.payables.length}</span>
                </span>
              </h2>
              {state.payables.length === 0 ? (
                <div className="card">
                  <div className="empty">
                    <strong>Nada a pagar ou receber</strong>
                    Pendências com valor aparecem aqui.
                  </div>
                </div>
              ) : (
                <div className="card flush list">
                  {state.payables.map((row) => (
                    <PayableRow key={row.id} row={row} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="section-title">
                <span>Lançamentos</span>
                {state.envelopeFilter === null ? null : (
                  <button
                    className="link"
                    type="button"
                    onClick={() =>
                      state.envelopeFilter && controls.toggleEnvelopeFilter(state.envelopeFilter.id)
                    }
                  >
                    Mostrando {state.envelopeFilter.name} · limpar
                  </button>
                )}
              </h2>
              <div className="card flush">
                {state.dayGroups.length === 0 ? (
                  <div className="empty">
                    <strong>Nenhum lançamento</strong>
                    Use o botão + para registrar um gasto.
                  </div>
                ) : (
                  state.dayGroups.map((group) => (
                    <div key={group.dayText}>
                      <div className="day-heading">{group.dayText}</div>
                      {group.rows.map((row) => (
                        <TransactionRow
                          key={row.id}
                          row={row}
                          onOpen={(transactionId) =>
                            setOpenSheet({ kind: "detail", transactionId })
                          }
                        />
                      ))}
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        ) : null}
      </main>

      {state.status === "ready" ? (
        <button
          className="fab fixed bottom-above-tabs right-4 z-10"
          type="button"
          aria-label="Adicionar"
          onClick={() => setOpenSheet({ kind: "add" })}
        >
          <Icon name="plus" size={26} />
        </button>
      ) : null}

      {openSheet?.kind === "add" ? (
        <AddTransactionSheet
          envelopeOptions={model.envelopeOptions}
          onCreate={actions.addTransaction}
          onClose={closeSheet}
        />
      ) : null}

      {openSheet?.kind === "detail" && detailRow !== undefined ? (
        <TransactionDetailSheet
          row={detailRow}
          onRemove={() => actions.removeTransaction(detailRow.id)}
          onClose={closeSheet}
        />
      ) : null}

      {isOpeningBalanceSheetOpen ? (
        <OpeningBalanceSheet onSave={actions.saveOpeningBalance} onClose={closeSheet} />
      ) : null}
    </div>
  );
}
