import { ASSETS, SCENARIO_NAMES, TARIFFS } from "./model";
import type { Household, Scenario } from "./model";

export interface SavedPlan {
  version: 1;
  household: Household;
  scenario: Scenario;
  checked: string[];
  notes: string;
  createdAt: string;
}

export const STORAGE_KEY = "ekz-flexibility-demo-plan-v1";

export function parsePlan(raw: string | null): SavedPlan | null {
  if (!raw) return null;
  try {
    const plan = JSON.parse(raw) as SavedPlan;
    if (plan.version !== 1 || !plan.household?.assets || !plan.scenario)
      return null;
    if (
      !["single", "multi"].includes(plan.household.building) ||
      !["dwelling", "building", "communal"].includes(plan.household.meter) ||
      !["owner", "resident", "manager"].includes(plan.household.role)
    )
      return null;
    if (
      ASSETS.some(({ id }) => {
        const asset = plan.household.assets[id];
        return (
          !asset ||
          !["confirmed", "inferred", "absent", "unknown"].includes(
            asset.status,
          ) ||
          !Number.isFinite(asset.capacity) ||
          asset.capacity < 0 ||
          asset.capacity > 50 ||
          typeof asset.shared !== "boolean"
        );
      })
    )
      return null;
    if (
      !Object.hasOwn(SCENARIO_NAMES, plan.scenario.kind) ||
      !TARIFFS.some((tariff) => tariff.id === plan.scenario.tariff)
    )
      return null;
    if (
      ![plan.scenario.startHour, plan.scenario.readyHour].every(
        (hour) => Number.isInteger(hour) && hour >= 0 && hour < 24,
      )
    )
      return null;
    if (
      !Number.isFinite(plan.scenario.solarKwp) ||
      plan.scenario.solarKwp < 0 ||
      plan.scenario.solarKwp > 12
    )
      return null;
    if (
      !Number.isFinite(plan.scenario.batteryKwh) ||
      plan.scenario.batteryKwh < 0 ||
      plan.scenario.batteryKwh > 15
    )
      return null;
    if (
      !Number.isFinite(plan.scenario.curtailment) ||
      plan.scenario.curtailment < 0 ||
      plan.scenario.curtailment > 100 ||
      typeof plan.scenario.withBattery !== "boolean"
    )
      return null;
    if (
      !Array.isArray(plan.checked) ||
      !plan.checked.every((item) => typeof item === "string") ||
      typeof plan.notes !== "string" ||
      !Number.isFinite(Date.parse(plan.createdAt))
    )
      return null;
    return plan;
  } catch {
    return null;
  }
}

export function loadPlan() {
  try {
    return parsePlan(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function persistPlan(plan: SavedPlan) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    return true;
  } catch {
    return false;
  }
}

export function downloadText(
  filename: string,
  text: string,
  contentType = "text/plain",
) {
  const url = URL.createObjectURL(
    new Blob([text], { type: `${contentType};charset=utf-8` }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
