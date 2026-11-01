import { describe, expect, it } from "vitest";
import {
  ASSETS,
  calculateMetrics,
  CHARGING_ENERGY,
  DEFAULT_SCENARIO,
  defaultHousehold,
  METER_POINTS,
  simulate,
  solarAt,
  STEP_HOURS,
} from "./model";

describe("household and scenario model", () => {
  it("retains all 96 observations when the household interpretation changes", () => {
    const original = structuredClone(METER_POINTS);
    const household = defaultHousehold();
    household.assets.ev.status = "absent";
    household.building = "multi";
    const result = simulate(household, DEFAULT_SCENARIO);
    expect(result.feasible).toBe(false);
    expect(result.points.map((point) => point.observed)).toEqual(
      original.map((point) => point.observed),
    );
    expect(METER_POINTS).toEqual(original);
    expect(ASSETS).toHaveLength(7);
    expect(result.points).toHaveLength(96);
  });

  it("requires confirmation before assigning a charging saving", () => {
    const result = simulate(defaultHousehold(), DEFAULT_SCENARIO);
    expect(result.feasible).toBe(false);
    expect(result.shiftedKwh).toBe(0);
    expect(
      result.points.every((point) => point.observed === point.proposed),
    ).toBe(true);
  });

  it("preserves charging energy and respects charger power and readiness", () => {
    const household = defaultHousehold();
    household.assets.ev.status = "confirmed";
    const result = simulate(household, DEFAULT_SCENARIO);
    expect(result.feasible).toBe(true);
    expect(result.current.importKwh).toBeCloseTo(result.proposed.importKwh, 8);
    expect(result.shiftedKwh).toBeCloseTo(CHARGING_ENERGY, 8);
    const additional = result.points.filter(
      (point) => point.proposed > point.observed + 0.00001,
    );
    expect(
      additional.every((point) => point.hour >= 23 || point.hour < 7),
    ).toBe(true);
    expect(
      additional.every(
        (point) =>
          point.proposed - point.observed <=
          household.assets.ev.capacity + 0.00001,
      ),
    ).toBe(true);
    expect(result.points.every((point) => point.proposed >= 0)).toBe(true);
  });

  it("blocks a charging window that cannot meet the energy requirement", () => {
    const household = defaultHousehold();
    household.assets.ev.status = "confirmed";
    const result = simulate(household, {
      ...DEFAULT_SCENARIO,
      startHour: 6,
      readyHour: 7,
    });
    expect(result.feasible).toBe(false);
    expect(result.reason).toContain("cannot deliver");
    expect(
      result.points.every((point) => point.proposed === point.observed),
    ).toBe(true);
  });

  it("does not invent a time-shifting saving on a flat tariff", () => {
    const household = defaultHousehold();
    household.assets.ev.status = "confirmed";
    const result = simulate(household, {
      ...DEFAULT_SCENARIO,
      tariff: "standard",
    });
    expect(result.tariffOnly.annualCost).toBeCloseTo(
      result.proposed.annualCost,
      8,
    );
    const constantLoad = calculateMetrics(
      Array.from({ length: 96 }, () => 1),
      "standard",
    );
    expect(constantLoad.annualCost).toBeCloseTo(24 * 0.29 * 365 + 8.5 * 12, 8);
  });

  it("keeps PV curtailment one-sided and within available output", () => {
    const household = defaultHousehold();
    household.assets.solar.status = "confirmed";
    const result = simulate(household, {
      ...DEFAULT_SCENARIO,
      kind: "curtail",
      curtailment: 150,
    });
    expect(result.feasible).toBe(true);
    expect(
      result.points.every((point) => point.proposed >= point.observed),
    ).toBe(true);
    expect(
      result.points.every(
        (point) =>
          point.generation <=
          solarAt(point.hour, household.assets.solar.capacity) + 0.00001,
      ),
    ).toBe(true);
    expect(
      result.points
        .filter((point) => point.hour < 6 || point.hour >= 18)
        .every((point) => point.generation === 0),
    ).toBe(true);
  });

  it("balances a battery cycle with losses and without concurrent charge/discharge", () => {
    const result = simulate(defaultHousehold(), {
      ...DEFAULT_SCENARIO,
      kind: "solar",
      withBattery: true,
    });
    const charged = result.points.reduce(
      (total, point) => total + point.charge * STEP_HOURS,
      0,
    );
    const discharged = result.points.reduce(
      (total, point) => total + point.discharge * STEP_HOURS,
      0,
    );
    expect(charged).toBeGreaterThan(0);
    expect(charged).toBeLessThanOrEqual(DEFAULT_SCENARIO.batteryKwh + 0.00001);
    expect(discharged).toBeCloseTo(charged * 0.9, 8);
    let stored = 0;
    result.points.forEach((point) => {
      expect(point.charge === 0 || point.discharge === 0).toBe(true);
      expect(point.proposed).toBeCloseTo(
        point.observed - point.generation + point.charge - point.discharge,
        8,
      );
      stored += (point.charge - point.discharge / 0.9) * STEP_HOURS;
      expect(stored).toBeGreaterThanOrEqual(-0.00001);
      expect(stored).toBeLessThanOrEqual(DEFAULT_SCENARIO.batteryKwh + 0.00001);
    });
    expect(stored).toBeCloseTo(0, 8);
  });

  it("requires approval for a resident to change shared equipment", () => {
    const household = defaultHousehold();
    household.building = "multi";
    household.role = "resident";
    household.assets.ev = { status: "confirmed", capacity: 3.6, shared: true };
    expect(simulate(household, DEFAULT_SCENARIO).needsApproval).toBe(true);
    expect(
      simulate(household, { ...DEFAULT_SCENARIO, kind: "solar" }).needsApproval,
    ).toBe(true);
  });

  it("does not change operational emissions just by switching tariffs", () => {
    const result = simulate(defaultHousehold(), {
      ...DEFAULT_SCENARIO,
      kind: "tariff",
    });
    expect(result.annualCarbonChange).toBe(0);
    expect(result.gridWindowChange).toBe(0);
  });

  it("does not attribute tariff-only savings to investment payback", () => {
    const result = simulate(defaultHousehold(), { ...DEFAULT_SCENARIO, kind: 'solar', tariff: 'standard' });
    const incrementalSaving = result.tariffOnly.annualCost - result.proposed.annualCost;
    expect(result.payback).toBeCloseTo(result.capitalCost / incrementalSaving, 8);
    expect(result.payback).not.toBeCloseTo(result.capitalCost / result.annualSavings, 4);
  });

  it("requires shared-equipment approval for a dwelling owner", () => {
    const household = defaultHousehold();
    household.building = 'multi';
    household.assets.ev = { status: 'confirmed', capacity: 3.6, shared: true };
    expect(simulate(household, DEFAULT_SCENARIO).needsApproval).toBe(true);
    household.role = 'manager';
    expect(simulate(household, DEFAULT_SCENARIO).needsApproval).toBe(false);
  });

  it("rejects an EV attribution above the confirmed charger power", () => {
    const household = defaultHousehold();
    household.assets.ev = { status: 'confirmed', capacity: 2, shared: false };
    const result = simulate(household, DEFAULT_SCENARIO);
    expect(result.feasible).toBe(false);
    expect(result.reason).toContain('load attribution');
    expect(result.shiftedKwh).toBe(0);
  });
});
