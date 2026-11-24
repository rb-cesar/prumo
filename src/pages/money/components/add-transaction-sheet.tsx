import { useState } from "react";
import type { NewTransactionForm, SaveResult } from "../model";
import { BottomSheet } from "./bottom-sheet";
import { Segmented } from "./segmented";

type AddTransactionSheetProps = {
  envelopeOptions: Array<{ id: string; name: string }>;
  onCreate: (form: NewTransactionForm) => Promise<SaveResult>;
  onClose: () => void;
};

function describeFailure(reason: Extract<SaveResult, { ok: false }>["reason"]): string {
  if (reason === "amount-not-a-number" || reason === "invalid-amount") {
    return "O valor não parece certo. Use um formato como 120,50.";
  }
  if (reason === "description-required") return "Escreva uma descrição curta.";
  if (reason === "expense-needs-envelope") return "Escolha o envelope do gasto.";
  return "Não foi possível salvar o lançamento.";
}

export function AddTransactionSheet({
  envelopeOptions,
  onCreate,
  onClose,
}: AddTransactionSheetProps) {
  const [form, setForm] = useState<NewTransactionForm>({
    kind: "expense",
    amountText: "",
    description: "",
    envelopeId: envelopeOptions[0]?.id ?? "",
  });
  const [errorText, setErrorText] = useState<string | null>(null);
  const isExpense = form.kind === "expense";

  function change<Field extends keyof NewTransactionForm>(
    field: Field,
    value: NewTransactionForm[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    const result = await onCreate(form);
    if (result.ok) onClose();
    else setErrorText(describeFailure(result.reason));
  }

  return (
    <BottomSheet title="Novo lançamento" onClose={onClose}>
      <Segmented
        kind="choice"
        label="Tipo do lançamento"
        value={form.kind}
        onChange={(value) => change("kind", value)}
        options={[
          { value: "expense", label: "Gasto" },
          { value: "income", label: "Receita" },
        ]}
      />
      <div className="field">
        <label className="field-label" htmlFor="new-transaction-amount">
          Valor
        </label>
        <input
          className="input numeric"
          id="new-transaction-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={form.amountText}
          onChange={(event) => change("amountText", event.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="new-transaction-description">
          Descrição
        </label>
        <input
          className="input"
          id="new-transaction-description"
          type="text"
          autoComplete="off"
          placeholder={isExpense ? "Ex.: Almoço" : "Ex.: Freela"}
          value={form.description}
          onChange={(event) => change("description", event.target.value)}
        />
      </div>
      {isExpense ? (
        <div className="field">
          <label className="field-label" htmlFor="new-transaction-envelope">
            Envelope
          </label>
          <select
            className="select"
            id="new-transaction-envelope"
            value={form.envelopeId}
            onChange={(event) => change("envelopeId", event.target.value)}
          >
            {envelopeOptions.map((envelope) => (
              <option key={envelope.id} value={envelope.id}>
                {envelope.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <p className="small muted">Registrado com a data de hoje.</p>
      {errorText === null ? null : (
        <p className="form-error" role="alert">
          {errorText}
        </p>
      )}
      <button className="btn btn-primary btn-block" type="button" onClick={submit}>
        Salvar
      </button>
      <button className="btn btn-secondary btn-block" type="button" onClick={onClose}>
        Cancelar
      </button>
    </BottomSheet>
  );
}
