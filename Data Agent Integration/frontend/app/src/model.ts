export type AssetId =
  | "ev"
  | "solar"
  | "battery"
  | "heatPump"
  | "waterHeater"
  | "lighting"
  | "appliances";
export type AssetStatus = "confirmed" | "inferred" | "absent" | "unknown";
export type TariffId = "standard" | "day-night" | "flex";
export type ScenarioKind =
  "charging" | "tariff" | "solar" | "battery" | "curtail";

export interface Asset {
  status: AssetStatus;
  capacity: number;
  shared: boolean;
}

export interface Household {
  building: "single" | "multi";
  meter: "dwelling" | "building" | "communal";
  role: "owner" | "resident" | "manager";
  assets: Record<AssetId, Asset>;
}

export interface Scenario {
  kind: ScenarioKind;
  tariff: TariffId;
  startHour: number;
  readyHour: number;
  solarKwp: number;
  batteryKwh: number;
  withBattery: boolean;
  curtailment: number;
}

export const ASSETS: {
  id: AssetId;
  name: string;
  unit: string;
  capacity: number;
  flexibility: string;
}[] = [
  {
    id: "ev",
    name: "Electric car",
    unit: "kW charging",
    capacity: 3.6,
    flexibility: "Shift charging; no discharge assumed",
  },
  {
    id: "solar",
    name: "Solar PV",
    unit: "kWp installed",
    capacity: 5,
    flexibility: "Curtail only; sunlight limits generation",
  },
  {
    id: "battery",
    name: "Home battery",
    unit: "kWh storage",
    capacity: 8,
    flexibility: "Charge or discharge within available capacity",
  },
  {
    id: "heatPump",
    name: "Heat pump",
    unit: "kW electrical",
    capacity: 2.5,
    flexibility: "Shift within comfort and thermal limits",
  },
  {
    id: "waterHeater",
    name: "Electric water heater",
    unit: "kW heating",
    capacity: 2,
    flexibility: "Shift within hot-water and hygiene limits",
  },
  {
    id: "lighting",
    name: "Lighting",
    unit: "kW connected",
    capacity: 0.3,
    flexibility: "Reduce where safe; not a deferred load",
  },
  {
    id: "appliances",
    name: "Home appliances",
    unit: "kW connected",
    capacity: 1.5,
    flexibility: "Defer suitable cycles; essential loads excluded",
  },
];

export function defaultHousehold(): Household {
  return {
    building: "single",
    meter: "dwelling",
    role: "owner",
    assets: Object.fromEntries(
      ASSETS.map((asset) => [
        asset.id,
        {
          status:
            asset.id === "ev"
              ? "inferred"
              : ["heatPump", "lighting", "appliances"].includes(asset.id)
                ? "confirmed"
                : "absent",
          capacity: asset.capacity,
          shared: false,
        },
      ]),
    ) as Record<AssetId, Asset>,
  };
}

export const DEFAULT_SCENARIO: Scenario = {
  kind: "charging",
  tariff: "flex",
  startHour: 23,
  readyHour: 7,
  solarKwp: 5,
  batteryKwh: 8,
  withBattery: false,
  curtailment: 50,
};

export const CURRENT_TARIFF: TariffId = "day-night";
export const STEP_HOURS = 0.25;
export const EXAMPLE_DAYS = 365;
export const EXPORT_RATE = 0.08;
export const CHARGING_ENERGY = 7.2;

export const TARIFFS: {
  id: TariffId;
  name: string;
  monthlyFee: number;
  description: string;
}[] = [
  {
    id: "standard",
    name: "Standard",
    monthlyFee: 8.5,
    description: "29 rp/kWh, all day",
  },
  {
    id: "day-night",
    name: "Day & night",
    monthlyFee: 8.5,
    description: "34 rp day / 22 rp night",
  },
  {
    id: "flex",
    name: "Flex",
    monthlyFee: 10,
    description: "17-42 rp/kWh, by time window",
  },
];

export function priceAt(tariff: TariffId, hour: number) {
  if (tariff === "standard") return 0.29;
  if (tariff === "day-night") return hour >= 7 && hour < 22 ? 0.34 : 0.22;
  if (hour >= 17 && hour < 21) return 0.42;
  if (hour >= 11 && hour < 16) return 0.2;
  if (hour < 7 || hour >= 22) return 0.17;
  return 0.26;
}

export function solarAt(hour: number, capacity: number) {
  return hour >= 6 && hour < 18
    ? Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI)) * capacity * 0.82
    : 0;
}

export interface MeterPoint {
  index: number;
  hour: number;
  time: string;
  observed: number;
  carbon: number;
  constrained: boolean;
}

export const METER_POINTS: readonly MeterPoint[] = Array.from(
  { length: 96 },
  (_, index) => {
    const hour = index / 4;
    const base = 0.34 + (Math.sin(index * 1.7) + 1) * 0.055;
    const heating =
      (hour >= 5.5 && hour < 7.5 ? 1.4 : 0) + (hour >= 16 && hour < 17 ? 1 : 0);
    const meals =
      (hour >= 7 && hour < 8.5 ? 0.75 : 0) +
      (hour >= 12 && hour < 13 ? 1.1 : 0);
    const evening = hour >= 17 && hour < 23 ? 0.5 : 0;
    const charging = hour >= 18 && hour < 20 ? 3.6 : 0;
    const appliances = hour >= 20.5 && hour < 21.5 ? 0.7 : 0;
    return {
      index,
      hour,
      time: `${String(Math.floor(hour)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`,
      observed: base + heating + meals + evening + charging + appliances,
      carbon:
        hour >= 17 && hour < 21 ? 0.21 : hour >= 11 && hour < 16 ? 0.07 : 0.12,
      constrained: hour >= 17 && hour < 21,
    };
  },
);

export interface Metrics {
  importKwh: number;
  exportKwh: number;
  dailyCost: number;
  annualCost: number;
  annualCarbon: number;
  gridWindowKwh: number;
  peakKw: number;
}

export function calculateMetrics(
  power: readonly number[],
  tariff: TariffId,
): Metrics {
  const fee = TARIFFS.find((option) => option.id === tariff)!.monthlyFee;
  let importKwh = 0;
  let exportKwh = 0;
  let variableCost = 0;
  let carbon = 0;
  let gridWindowKwh = 0;
  power.forEach((draw, index) => {
    const imported = Math.max(0, draw) * STEP_HOURS;
    const exported = Math.max(0, -draw) * STEP_HOURS;
    importKwh += imported;
    exportKwh += exported;
    variableCost +=
      imported * priceAt(tariff, METER_POINTS[index].hour) -
      exported * EXPORT_RATE;
    carbon += imported * METER_POINTS[index].carbon;
    if (METER_POINTS[index].constrained) gridWindowKwh += imported;
  });
  const annualCost = variableCost * EXAMPLE_DAYS + fee * 12;
  return {
    importKwh,
    exportKwh,
    annualCost,
    dailyCost: annualCost / EXAMPLE_DAYS,
    annualCarbon: carbon * EXAMPLE_DAYS,
    gridWindowKwh,
    peakKw: Math.max(0, ...power),
  };
}

export interface ScenarioPoint extends MeterPoint {
  proposed: number;
  charge: number;
  discharge: number;
  generation: number;
}

export interface Result {
  points: ScenarioPoint[];
  current: Metrics;
  tariffOnly: Metrics;
  behaviourOnly: Metrics;
  proposed: Metrics;
  feasible: boolean;
  reason: string;
  needsApproval: boolean;
  annualSavings: number;
  annualCarbonChange: number;
  gridWindowChange: number;
  shiftedKwh: number;
  capitalCost: number;
  payback: number | null;
}

export function simulate(household: Household, scenario: Scenario): Result {
  const points: ScenarioPoint[] = METER_POINTS.map((point) => ({
    ...point,
    proposed: point.observed,
    charge: 0,
    discharge: 0,
    generation: 0,
  }));
  let reason = "";
  let shiftedKwh = 0;
  let capitalCost = 0;

  if (scenario.kind === "charging") {
    if (household.assets.ev.status !== "confirmed") {
      reason =
        "Confirm the electric car and charging pattern before estimating a charging change.";
    } else {
      const start = scenario.startHour * 4;
      const duration = (scenario.readyHour * 4 - start + 96) % 96;
      const slots = Array.from(
        { length: duration },
        (_, offset) => (start + offset) % 96,
      );
      const power = Math.max(0, household.assets.ev.capacity);
      if (power < 3.6) {
        reason = 'The confirmed charger power cannot explain the assumed 3.6 kW evening block. Refine the load attribution before estimating a shift.';
      } else if (power * slots.length * STEP_HOURS < CHARGING_ENERGY - 0.000001) {
        reason = `The charging window cannot deliver ${CHARGING_ENERGY} kWh. Allow more time or confirm the charger power.`;
      } else {
        points.forEach((point) => {
          if (point.hour >= 18 && point.hour < 20) point.proposed -= 3.6;
        });
        let remaining = CHARGING_ENERGY;
        slots.forEach((index) => {
          const added = Math.min(power, remaining / STEP_HOURS);
          points[index].proposed += added;
          remaining = Math.max(0, remaining - added * STEP_HOURS);
        });
        shiftedKwh = points.reduce(
          (total, point) =>
            total + Math.max(0, point.observed - point.proposed) * STEP_HOURS,
          0,
        );
      }
    }
  }

  if (scenario.kind === "solar") {
    const capacity = Math.max(0, Math.min(12, scenario.solarKwp));
    points.forEach((point) => {
      point.generation = solarAt(point.hour, capacity);
      point.proposed -= point.generation;
    });
    capitalCost += capacity * 1800;
  }

  if (scenario.kind === "curtail") {
    if (household.assets.solar.status !== "confirmed") {
      reason =
        "Confirm existing solar before exploring curtailment. Generation telemetry is not available.";
    } else {
      points.forEach((point) => {
        if (point.hour >= 11 && point.hour < 15) {
          point.generation =
            (solarAt(point.hour, household.assets.solar.capacity) *
              Math.max(0, Math.min(100, scenario.curtailment))) /
            100;
          point.proposed += point.generation;
        }
      });
    }
  }

  if (
    scenario.kind === "battery" ||
    (scenario.kind === "solar" && scenario.withBattery)
  ) {
    const capacity = Math.max(0, Math.min(15, scenario.batteryKwh));
    const efficiency = 0.9;
    const maximumPower = 3;
    const peakDemand = points
      .filter((point) => point.constrained)
      .reduce(
        (total, point) =>
          total +
          Math.min(maximumPower, Math.max(0, point.proposed)) * STEP_HOURS,
        0,
      );
    let energyToCharge = Math.min(capacity, peakDemand / efficiency);
    const chargingSlots = points
      .filter((point) => point.hour < 17)
      .sort((first, second) => {
        const firstCost =
          first.proposed < 0
            ? EXPORT_RATE
            : priceAt(scenario.tariff, first.hour);
        const secondCost =
          second.proposed < 0
            ? EXPORT_RATE
            : priceAt(scenario.tariff, second.hour);
        return firstCost - secondCost || first.index - second.index;
      });
    let charged = 0;
    chargingSlots.forEach((point) => {
      const availablePower =
        point.proposed < 0
          ? Math.min(maximumPower, -point.proposed)
          : maximumPower;
      point.charge = Math.min(availablePower, energyToCharge / STEP_HOURS);
      point.proposed += point.charge;
      const energy = point.charge * STEP_HOURS;
      charged += energy;
      energyToCharge = Math.max(0, energyToCharge - energy);
    });
    let energyToDischarge = charged * efficiency;
    points
      .filter((point) => point.constrained)
      .forEach((point) => {
        point.discharge = Math.min(
          maximumPower,
          Math.max(0, point.proposed),
          energyToDischarge / STEP_HOURS,
        );
        point.proposed -= point.discharge;
        energyToDischarge = Math.max(
          0,
          energyToDischarge - point.discharge * STEP_HOURS,
        );
      });
    capitalCost += capacity * 950;
  }

  const observed = points.map((point) => point.observed);
  const adjusted = points.map((point) => point.proposed);
  const current = calculateMetrics(observed, CURRENT_TARIFF);
  const proposed = calculateMetrics(adjusted, scenario.tariff);
  const tariffOnly = calculateMetrics(observed, scenario.tariff);
  const investmentSavings = tariffOnly.annualCost - proposed.annualCost;
  const annualSavings = current.annualCost - proposed.annualCost;
  const affectedAsset: AssetId | null =
    scenario.kind === "charging"
      ? "ev"
      : scenario.kind === "curtail" || scenario.kind === "solar"
        ? "solar"
        : scenario.kind === "battery"
          ? "battery"
          : null;
  const investment = scenario.kind === "solar" || scenario.kind === "battery";
  const needsApproval =
    (household.role === "resident" && investment) ||
    (household.role !== "manager" &&
      ((household.building === "multi" && household.meter !== "dwelling") ||
        (affectedAsset !== null && household.assets[affectedAsset].shared)));

  return {
    points,
    current,
    proposed,
    tariffOnly,
    behaviourOnly: calculateMetrics(adjusted, CURRENT_TARIFF),
    feasible: reason === "",
    reason,
    needsApproval,
    annualSavings,
    annualCarbonChange: current.annualCarbon - proposed.annualCarbon,
    gridWindowChange: current.gridWindowKwh - proposed.gridWindowKwh,
    shiftedKwh,
    capitalCost,
    payback:
      capitalCost > 0 && investmentSavings > 0 ? capitalCost / investmentSavings : null,
  };
}

export function hourLabel(hour: number) {
  return `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`;
}

export function money(value: number, decimals = 0) {
  return `CHF ${new Intl.NumberFormat("en-CH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)}`;
}

export function number(value: number, decimals = 1) {
  return new Intl.NumberFormat("en-CH", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export const SCENARIO_NAMES: Record<ScenarioKind, string> = {
  charging: "Move charging out of the evening",
  tariff: "Find a better-fitting tariff",
  solar: "Explore rooftop solar",
  battery: "Explore home storage",
  curtail: "Explore solar curtailment",
};
