import {
  calculateMetrics,
  CURRENT_TARIFF,
  DEFAULT_SCENARIO,
  METER_POINTS,
  SCENARIO_NAMES,
  simulate,
  TARIFFS,
} from "./model";
import type { Household, Result, Scenario, ScenarioKind } from "./model";

export function scenarioFor(kind: ScenarioKind): Scenario {
  const tariff =
    kind === "tariff"
      ? [...TARIFFS].sort(
          (first, second) =>
            calculateMetrics(
              METER_POINTS.map((point) => point.observed),
              first.id,
            ).annualCost -
            calculateMetrics(
              METER_POINTS.map((point) => point.observed),
              second.id,
            ).annualCost,
        )[0].id
      : CURRENT_TARIFF;
  return { ...DEFAULT_SCENARIO, kind, tariff };
}

export interface Opportunity {
  kind: ScenarioKind;
  title: string;
  description: string;
  category: "routine" | "tariff" | "investment" | "grid";
  effort: string;
  result: Result;
}

export function opportunitiesFor(household: Household): Opportunity[] {
  const definitions: Omit<Opportunity, "result">[] = [
    {
      kind: "charging",
      title: SCENARIO_NAMES.charging,
      description:
        "The same charge, ready for the morning. Your schedule stays in your hands.",
      category: "routine",
      effort: "One timer setting",
    },
    {
      kind: "tariff",
      title: SCENARIO_NAMES.tariff,
      description:
        "Keep your current routine. Compare the full cost of the example tariffs.",
      category: "tariff",
      effort: "Contract review",
    },
    {
      kind: "solar",
      title:
        household.assets.solar.status === "confirmed"
          ? "Explore additional solar"
          : SCENARIO_NAMES.solar,
      description:
        "Generate during the day. Roof suitability and an individual quote come first.",
      category: "investment",
      effort: "Property assessment",
    },
    {
      kind: "battery",
      title: SCENARIO_NAMES.battery,
      description:
        "Move stored electricity to the evening, with losses and upfront cost included.",
      category: "investment",
      effort: "Installation required",
    },
    {
      kind: "curtail",
      title: SCENARIO_NAMES.curtail,
      description:
        "Reduce generation only for a verified network need. Compensation is not assumed.",
      category: "grid",
      effort: "Network agreement",
    },
  ];
  return definitions
    .filter(
      (option) =>
        option.kind !== "charging" || household.assets.ev.status !== "absent",
    )
    .filter(
      (option) =>
        option.kind !== "curtail" ||
        household.assets.solar.status === "confirmed",
    )
    .map((option) => ({
      ...option,
      result: simulate(household, scenarioFor(option.kind)),
    }));
}
