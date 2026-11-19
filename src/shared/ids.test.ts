import { describe, expect, it } from "vitest";
import { generateId } from "./ids";

describe("generateId", () => {
  it("gera ids diferentes a cada chamada", () => {
    expect(generateId()).not.toBe(generateId());
  });

  it("gera ids no formato UUID", () => {
    expect(generateId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
