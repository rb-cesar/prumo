import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./app";

afterEach(cleanup);

describe("App", () => {
  it("mostra o nome do app na tela inicial", () => {
    render(<App />);

    const appTitle = screen.getByRole("heading", { name: "Prumo" });

    expect(appTitle).not.toBeNull();
  });
});
