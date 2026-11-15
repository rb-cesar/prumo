import { HashRouter, Route, Routes } from "react-router-dom";

function HelloScreen() {
  return (
    <main>
      <h1>Prumo</h1>
      <p>Olá. A fundação do app está de pé.</p>
    </main>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HelloScreen />} />
      </Routes>
    </HashRouter>
  );
}
