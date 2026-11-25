import { HashRouter, Route, Routes } from "react-router-dom";
import { GoalsPage } from "./pages/goals/goals-page";
import { HistoryPage } from "./pages/history/history-page";
import { MoneyPage } from "./pages/money/money-page";
import { TasksPage } from "./pages/tasks/tasks-page";
import { TodayPage } from "./pages/today/today-page";
import { TabBar } from "./shared/tab-bar";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/money" element={<MoneyPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
      <TabBar />
    </HashRouter>
  );
}
