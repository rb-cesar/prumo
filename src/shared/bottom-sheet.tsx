import type { ReactNode } from "react";

type BottomSheetProps = { title: string; onClose: () => void; children: ReactNode };

/** Folha que sobe da base da tela, sobre um véu. Tocar no véu fecha. */
export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        className="sheet-backdrop cursor-default border-0"
        type="button"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="sheet max-h-[92%] max-w-[480px] overflow-y-auto">
        <div className="sheet-handle" />
        <h2 className="sheet-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
