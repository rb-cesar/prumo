import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import tailwindConfig from "../../tailwind.config";

const tokensCss = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf-8");

function variablesDefinedInTokens(): Set<string> {
  const definitions = tokensCss.matchAll(/^\s*(--[\w-]+):/gm);
  return new Set([...definitions].map((match) => match[1] as string));
}

function variablesUsedByTailwind(): string[] {
  const configAsText = JSON.stringify(tailwindConfig);
  return [...configAsText.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1] as string);
}

describe("tokens.css e tailwind.config", () => {
  it("define toda variável que o Tailwind usa", () => {
    const defined = variablesDefinedInTokens();

    const missing = variablesUsedByTailwind().filter((variable) => !defined.has(variable));

    expect(missing).toEqual([]);
  });

  it("redefine as cores no tema escuro", () => {
    expect(tokensCss).toContain(':root[data-theme="dark"]');
  });
});
