import { useState } from "react";
import { BottomSheet } from "../../../shared/bottom-sheet";
import type { SaveResult } from "../model";

type OpeningBalanceSheetProps = {
  onSave: (amountText: string) => Promise<SaveResult>;
  onClose: () => void;
};

export function OpeningBalanceSheet({ onSave, onClose }: OpeningBalanceSheetProps) {
  const [amountText, setAmountText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  async function submit() {
    const result = await onSave(amountText);
    if (result.ok) onClose();
    else setErrorText("O valor não parece certo. Use um formato como 4.200,00.");
  }

  return (
    <BottomSheet title="Saldo inicial" onClose={onClose}>
      <p className="muted">
        Quanto você tem na conta hoje? É o ponto de partida: daqui em diante o saldo acompanha o que
        você lançar.
      </p>
      <div className="field">
        <label className="field-label" htmlFor="opening-balance-amount">
          Saldo hoje
        </label>
        <input
          className="input numeric"
          id="opening-balance-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
        />
      </div>
      {errorText === null ? null : (
        <p className="form-error" role="alert">
          {errorText}
        </p>
      )}
      <button className="btn btn-primary btn-block" type="button" onClick={submit}>
        Salvar
      </button>
      <button className="btn btn-secondary btn-block" type="button" onClick={onClose}>
        Agora não
      </button>
    </BottomSheet>
  );
}
