import { NavLink } from "react-router-dom";
import { Icon } from "./icon";

const TABS = [
  { path: "/", label: "Hoje", icon: "today" },
  { path: "/tasks", label: "Pendências", icon: "tasks" },
  { path: "/money", label: "Finanças", icon: "money" },
] as const;

/** Navegação principal, fixa na base. Cada tela nova do app ganha uma aba aqui. */
export function TabBar() {
  return (
    <nav
      className="tabbar fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px]"
      aria-label="Seções do app"
    >
      {TABS.map((tab) => (
        <NavLink key={tab.path} className="tab" to={tab.path} end>
          <Icon name={tab.icon} size={22} />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
