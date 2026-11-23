import { HashRouter, Route, Routes } from "react-router-dom";
import { MoneyPage } from "./pages/money/money-page";
import { TasksPage } from "./pages/tasks/tasks-page";
import { TabBar } from "./shared/tab-bar";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TasksPage />} />
        <Route path="/money" element={<MoneyPage />} />
      </Routes>
      <TabBar />
    </HashRouter>
  );
}
