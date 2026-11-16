import { describe, expect, it } from "vitest";
import { createFixedClock, formatLocalDate } from "./clock";

describe("formatLocalDate", () => {
  it("formata como AAAA-MM-DD com zeros à esquerda", () => {
    const thirdOfNovember = new Date(2026, 10, 3);

    expect(formatLocalDate(thirdOfNovember)).toBe("2026-11-03");
  });
});

describe("createFixedClock", () => {
  it("devolve sempre o dia combinado", () => {
    const clock = createFixedClock("2026-11-13");

    expect(clock.today()).toBe("2026-11-13");
  });

  it("usa o mesmo dia no agora e no hoje", () => {
    const clock = createFixedClock("2026-11-13");

    expect(formatLocalDate(clock.now())).toBe(clock.today());
  });
});
