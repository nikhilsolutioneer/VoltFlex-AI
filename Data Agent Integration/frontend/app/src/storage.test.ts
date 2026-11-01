import { expect, it } from "vitest";
import { DEFAULT_SCENARIO, defaultHousehold } from "./model";
import { parsePlan } from "./storage";

const plan = {
  version: 1,
  household: defaultHousehold(),
  scenario: DEFAULT_SCENARIO,
  checked: [],
  notes: "",
  createdAt: "2026-09-10T10:00:00Z",
};

it("round-trips a complete saved draft", () => {
  expect(parsePlan(JSON.stringify(plan))).toEqual(plan);
});

it("rejects malformed and incompatible saved drafts", () => {
  for (const raw of [
    null,
    "invalid",
    "null",
    "{}",
    JSON.stringify({ ...plan, version: 2 }),
    JSON.stringify({
      ...plan,
      scenario: { ...DEFAULT_SCENARIO, startHour: 42 },
    }),
  ]) {
    expect(parsePlan(raw)).toBeNull();
  }
});
