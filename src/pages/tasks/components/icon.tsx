/** Ícones de traço do Design System Prumo (grade de 24, traço de 1,8). Aqui só os que esta tela usa. */
const ICON_PATHS = {
  check: '<path d="m6 12.5 4 4 8-9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};

export function Icon({ name, size = 20 }: { name: keyof typeof ICON_PATHS; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: caminhos fixos deste arquivo, sem entrada de usuário
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
    />
  );
}
