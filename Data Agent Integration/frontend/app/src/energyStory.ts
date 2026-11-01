import { EXPORT_RATE, METER_POINTS, priceAt, STEP_HOURS } from "./model";
import type { AssetId, Household } from "./model";

export interface EnergyAction {
  id: AssetId;
  title: string;
  effect: string;
  explanation: string;
  requirement: string;
  from: number;
  to: number | null;
  duration: number;
  maxPower: number;
  efficiency: number;
}

export const ENERGY_ACTIONS: readonly EnergyAction[] = [
  {
    id: "ev",
    title: "Charge after the evening peak",
    effect: "Same charge, a lower price",
    explanation:
      "Set your charger to start at midnight and finish before you leave. This example moves two hours of charging out of the evening peak. Check the charge you need and your departure time first.",
    requirement: "Confirm an electric car in your home profile.",
    from: 18,
    to: 0,
    duration: 2,
    maxPower: 3.6,
    efficiency: 1,
  },
  {
    id: "solar",
    title: "Give your appliances some sunshine",
    effect: "Use solar instead of peak-price power",
    explanation:
      "Schedule a suitable appliance for the sunny lunchtime window. This example moves one cycle to your own solar power and includes the export income you give up. Check the solar forecast before setting the timer.",
    requirement: "Confirm solar PV and a flexible home appliance.",
    from: 19,
    to: 12,
    duration: 1,
    maxPower: 1.5,
    efficiency: 1,
  },
  {
    id: "battery",
    title: "Store energy for the busy hours",
    effect: "Less grid power at the evening peak",
    explanation:
      "Use your installed battery's schedule to charge at lunchtime and supply your home in the evening. This example respects a 3 kW charge limit and includes 10% energy loss. Your installer can check the schedule and battery warranty.",
    requirement: "Confirm an installed home battery.",
    from: 18,
    to: 13,
    duration: 2,
    maxPower: 2.7,
    efficiency: 0.9,
  },
  {
    id: "heatPump",
    title: "Bring a little warmth forward",
    effect: "A warm home, less evening demand",
    explanation:
      "Move one suitable heating hour to the cheaper afternoon window using your heat pump's schedule. Keep your comfort limits unchanged. This example assumes the warmth can be retained without extra heating; the actual result depends on your building.",
    requirement: "Confirm a heat pump in your home profile.",
    from: 18,
    to: 14,
    duration: 1,
    maxPower: 2.5,
    efficiency: 1,
  },
  {
    id: "waterHeater",
    title: "Heat water before the rush",
    effect: "Hot water ready at a lower cost",
    explanation:
      "Schedule a suitable water-heating cycle for lunchtime. Keep the manufacturer's hygiene cycle, safe temperature and enough hot water for your household. This example shifts one hour without changing the amount of hot water.",
    requirement: "Confirm an electric water heater.",
    from: 18,
    to: 13,
    duration: 1,
    maxPower: 2,
    efficiency: 1,
  },
  {
    id: "appliances",
    title: "Let a cycle wait until lunchtime",
    effect: "The same clean result, cheaper power",
    explanation:
      "Use the delay timer for a suitable dishwasher or laundry cycle at lunchtime. Follow the appliance's safety guidance and finish when you need it. This example shifts one cycle, not essential household loads.",
    requirement: "Confirm a flexible home appliance.",
    from: 19,
    to: 12,
    duration: 1,
    maxPower: 1.5,
    efficiency: 1,
  },
  {
    id: "lighting",
    title: "Switch off the lights you do not need",
    effect: "Less electricity, the same useful light",
    explanation:
      "Turn off unnecessary lights in empty rooms while keeping paths and occupied spaces safely lit. This example avoids half of the connected lighting load for two evening hours. Unlike charging, this energy is saved, not moved.",
    requirement: "Confirm lighting in your home profile.",
    from: 18,
    to: null,
    duration: 2,
    maxPower: 0.15,
    efficiency: 1,
  },
];

export function actionBlockReason(household: Household, action: EnergyAction) {
  const asset = household.assets[action.id];
  if (
    asset.status !== "confirmed" ||
    !Number.isFinite(asset.capacity) ||
    asset.capacity <= 0
  )
    return action.requirement;
  if (
    action.id === "solar" &&
    (household.assets.appliances.status !== "confirmed" ||
      !Number.isFinite(household.assets.appliances.capacity) ||
      household.assets.appliances.capacity <= 0)
  )
    return action.requirement;
  const needsApproval =
    asset.shared ||
    (action.id === "solar" && household.assets.appliances.shared) ||
    (household.building === "multi" && household.meter !== "dwelling");
  if (household.role !== "manager" && needsApproval)
    return "Ask your building manager to approve this shared equipment change.";
  return null;
}

export function actionPreview(household: Household, action: EnergyAction) {
  const asset = household.assets[action.id];
  const capacity = Number.isFinite(asset.capacity)
    ? Math.max(0, asset.capacity)
    : 0;
  const applianceCapacity = Number.isFinite(
    household.assets.appliances.capacity,
  )
    ? Math.max(0, household.assets.appliances.capacity)
    : 0;
  const availablePower =
    action.id === "battery"
      ? (capacity * action.efficiency) / action.duration
      : action.id === "lighting"
        ? capacity / 2
        : action.id === "solar"
          ? Math.min(capacity * 0.65, applianceCapacity)
          : capacity;
  const power = Math.max(0, Math.min(action.maxPower, availablePower));
  const points = METER_POINTS.map(({ hour, time }) => {
    const inOriginalWindow =
      hour >= action.from && hour < action.from + action.duration;
    const inNewWindow =
      action.to !== null &&
      hour >= action.to &&
      hour < action.to + action.duration;
    const base =
      0.4 +
      0.8 * Math.exp(-((hour - 7.5) ** 2) / 1.6) +
      0.6 * Math.exp(-((hour - 12.5) ** 2) / 2) +
      0.9 * Math.exp(-((hour - 19) ** 2) / 4);
    const before =
      action.id === "solar" && inNewWindow
        ? -power
        : base + (inOriginalWindow ? power : 0);
    const after =
      before -
      (inOriginalWindow ? power : 0) +
      (inNewWindow ? power / action.efficiency : 0);
    return {
      hour,
      time,
      before,
      after,
      price: priceAt("flex", hour) * 100,
      reduced: before > after ? [after, before] : [before, before],
      shifted: after > before ? [before, after] : [after, after],
    };
  });
  const cost = (value: number, hour: number) =>
    (Math.max(0, value) * priceAt("flex", hour) +
      Math.min(0, value) * EXPORT_RATE) *
    STEP_HOURS;
  const beforeCost = points.reduce(
    (total, point) => total + cost(point.before, point.hour),
    0,
  );
  const afterCost = points.reduce(
    (total, point) => total + cost(point.after, point.hour),
    0,
  );
  const savedCents = Math.max(0, Math.round((beforeCost - afterCost) * 100));
  return {
    points,
    beforeCost,
    afterCost,
    savedCents,
    energyKwh: power * action.duration,
  };
}

export interface StoryEntry {
  actionId: AssetId;
  savedCents: number;
  source: "example" | "played";
}

export function recordStoryAction(
  entries: readonly StoryEntry[],
  household: Household,
  actionId: AssetId,
): StoryEntry[] {
  const action = ENERGY_ACTIONS.find((item) => item.id === actionId);
  if (!action || actionBlockReason(household, action)) return [...entries];
  const { savedCents } = actionPreview(household, action);
  if (!savedCents) return [...entries];
  return [...entries, { actionId, savedCents, source: "played" }];
}

export function createDemoProgress(household: Household): StoryEntry[] {
  const available = ENERGY_ACTIONS.filter(
    (action) =>
      !actionBlockReason(household, action) &&
      actionPreview(household, action).savedCents > 0,
  );
  return available.slice(0, 2).flatMap((action, index) =>
    Array.from({ length: index === 0 ? 2 : 1 }, () => ({
      actionId: action.id,
      savedCents: actionPreview(household, action).savedCents,
      source: "example" as const,
    })),
  );
}

export function summarizeProgress(entries: readonly StoryEntry[]) {
  return {
    totalCents: entries.reduce((total, entry) => total + entry.savedCents, 0),
    actions: ENERGY_ACTIONS.map((action) => {
      const matching = entries.filter((entry) => entry.actionId === action.id);
      return {
        ...action,
        count: matching.length,
        savedCents: matching.reduce(
          (total, entry) => total + entry.savedCents,
          0,
        ),
      };
    }),
  };
}

export const MOMENTUM_PEERS = [
  { name: "SolarSophie", coins: 128.4 },
  { name: "WattAlex", coins: 106.75 },
  { name: "LumiNoah", coins: 89.6 },
  { name: "SunnyMia", coins: 64.2 },
  { name: "EcoLuca", coins: 38.5 },
  { name: "KiloWattKim", coins: 12.8 },
] as const;

export function momentumRanking(totalCents: number) {
  return [
    ...MOMENTUM_PEERS.map((peer) => ({ ...peer, you: false })),
    {
      name: "You",
      coins: totalCents / 100,
      you: true,
    },
  ].sort((left, right) => right.coins - left.coins);
}
