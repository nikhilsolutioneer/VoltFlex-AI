import { describe, expect, it } from "vitest";
import { defaultHousehold, METER_POINTS, STEP_HOURS } from "./model";
import {
  actionBlockReason,
  actionPreview,
  createDemoProgress,
  ENERGY_ACTIONS,
  momentumRanking,
  recordStoryAction,
  summarizeProgress,
} from "./energyStory";

describe("Energy Momentum actions", () => {
  it("awards the displayed CHF saving as coins and counts each demo occurrence", () => {
    const household = defaultHousehold();
    const action = ENERGY_ACTIONS.find((item) => item.id === "heatPump")!;
    const preview = actionPreview(household, action);
    expect(preview.savedCents).toBe(55);
    let entries = recordStoryAction([], household, action.id);
    expect(entries[0].savedCents).toBe(preview.savedCents);
    entries = recordStoryAction(entries, household, action.id);
    const summary = summarizeProgress(entries);
    expect(summary.totalCents / 100).toBe(1.1);
    expect(summary.actions.find((item) => item.id === action.id)?.count).toBe(
      2,
    );
  });

  it("never rewards absent, inferred, invalid or unapproved equipment", () => {
    const household = defaultHousehold();
    expect(recordStoryAction([], household, "ev")).toEqual([]);
    expect(recordStoryAction([], household, "solar")).toEqual([]);
    household.assets.heatPump.capacity = 0;
    expect(recordStoryAction([], household, "heatPump")).toEqual([]);
    household.assets.ev.status = "confirmed";
    household.assets.ev.shared = true;
    household.building = "multi";
    expect(recordStoryAction([], household, "ev")).toEqual([]);
    household.role = "manager";
    expect(recordStoryAction([], household, "ev")).toHaveLength(1);
  });

  it("requires approval for whole-building and communal meters without shared flags", () => {
    const household = defaultHousehold();
    household.building = "multi";
    for (const meter of ["building", "communal"] as const) {
      household.meter = meter;
      for (const role of ["owner", "resident"] as const) {
        household.role = role;
        expect(recordStoryAction([], household, "heatPump")).toEqual([]);
        expect(createDemoProgress(household)).toEqual([]);
      }
    }
    household.role = "manager";
    expect(recordStoryAction([], household, "heatPump")).toHaveLength(1);
  });

  it("requires valid appliance capacity for the solar self-consumption example", () => {
    const household = defaultHousehold();
    household.assets.solar.status = "confirmed";
    const solar = ENERGY_ACTIONS.find((action) => action.id === "solar")!;
    for (const capacity of [NaN, Infinity, -1, 0]) {
      household.assets.appliances.capacity = capacity;
      expect(recordStoryAction([], household, "solar")).toEqual([]);
      expect(actionPreview(household, solar).savedCents).toBe(0);
    }
  });

  it("preserves energy for shifting and includes battery losses and solar export cost", () => {
    const household = defaultHousehold();
    for (const asset of Object.values(household.assets))
      asset.status = "confirmed";
    for (const action of ENERGY_ACTIONS) {
      const preview = actionPreview(household, action);
      const difference = preview.points.reduce(
        (total, point) => total + (point.after - point.before) * STEP_HOURS,
        0,
      );
      if (action.id === "battery") expect(difference).toBeCloseTo(0.6);
      else if (action.id === "lighting") expect(difference).toBeCloseTo(-0.3);
      else expect(difference).toBeCloseTo(0);
      expect(preview.savedCents).toBe(
        Math.round((preview.beforeCost - preview.afterCost) * 100),
      );
    }
    const solar = ENERGY_ACTIONS.find((action) => action.id === "solar")!;
    expect(actionPreview(household, solar).savedCents).toBe(51);
    household.assets.appliances.status = "absent";
    expect(actionBlockReason(household, solar)).toBeTruthy();
  });

  it("scales rewards with the confirmed capacity without changing meter readings", () => {
    const household = defaultHousehold();
    const trace = JSON.stringify(METER_POINTS);
    const action = ENERGY_ACTIONS.find((item) => item.id === "heatPump")!;
    household.assets.heatPump.capacity = 1;
    expect(actionPreview(household, action).savedCents).toBe(22);
    expect(JSON.stringify(METER_POINTS)).toBe(trace);
  });

  it("seeds only eligible example actions and ranks the live total numerically", () => {
    const household = defaultHousehold();
    const entries = createDemoProgress(household);
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.source === "example")).toBe(true);
    expect(entries.some((entry) => entry.actionId === "ev")).toBe(false);
    expect(momentumRanking(15000)[0]).toMatchObject({
      name: "You",
      coins: 150,
    });
    for (const asset of Object.values(household.assets))
      asset.status = "absent";
    expect(createDemoProgress(household)).toEqual([]);
  });
});
