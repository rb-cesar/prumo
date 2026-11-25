/** Ícones de traço do Design System Prumo (grade de 24, traço de 1,8). Aqui só os que o app já usa. */
const ICON_PATHS = {
  check: '<path d="m6 12.5 4 4 8-9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  today:
    '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  tasks: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.6-5"/>',
  money:
    '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3.5"/><rect x="3.5" y="8" width="17" height="12" rx="2.5"/><circle cx="16.5" cy="14" r="1.2"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1-1"/>',
  goals:
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8"/>',
  vault:
    '<rect x="4" y="5" width="16" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M12 9.5v1M12 13.5v1"/>',
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
