import { HashRouter, Route, Routes } from "react-router-dom";
import { TasksPage } from "./pages/tasks/tasks-page";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TasksPage />} />
      </Routes>
    </HashRouter>
  );
}
