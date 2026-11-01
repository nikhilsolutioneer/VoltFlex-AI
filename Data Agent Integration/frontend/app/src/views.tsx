import { useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Building2,
  CarFront,
  Check,
  Clock3,
  Download,
  Earth,
  House,
  Info,
  Leaf,
  ListChecks,
  MessageCircle,
  Network,
  Pencil,
  PlugZap,
  SlidersHorizontal,
  Sun,
  Trash2,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ASSETS,
  CHARGING_ENERGY,
  CURRENT_TARIFF,
  EXAMPLE_DAYS,
  hourLabel,
  money,
  number,
  SCENARIO_NAMES,
  simulate,
  TARIFFS,
} from "./model";
import type {
  AssetStatus,
  Household,
  Result,
  Scenario,
  ScenarioKind,
  TariffId,
} from "./model";
import {
  Badge,
  ChartLegend,
  IconButton,
  Metric,
  PowerChart,
  Status,
} from "./components";
import { ASSET_ICONS } from "./icons";
import { opportunitiesFor, scenarioFor } from "./opportunities";
import { downloadText } from "./storage";
import type { SavedPlan } from "./storage";

export interface ViewActions {
  household: Household;
  onEditHome: () => void;
  onOpenScenario: (kind: ScenarioKind) => void;
  onAssumptions: () => void;
  onAsk: (question: string) => void;
}

const SCENARIO_ICONS: Record<ScenarioKind, LucideIcon> = {
  charging: CarFront,
  tariff: Wallet,
  solar: Sun,
  battery: BatteryCharging,
  curtail: SlidersHorizontal,
};

function HouseholdSnapshot({
  household,
  onEditHome,
  onOpenScenario,
}: Pick<ViewActions, "household" | "onEditHome" | "onOpenScenario">) {
  const BuildingIcon = household.building === "single" ? House : Building2;
  return (
    <aside className="home-snapshot">
      <div className="section-heading">
        <h2>Your household</h2>
        <IconButton icon={Pencil} label="Edit household" onClick={onEditHome} />
      </div>
      <div className="home-summary">
        <span className="home-icon">
          <BuildingIcon size={23} />
        </span>
        <div>
          <strong>
            {household.building === "single"
              ? "Single-family home"
              : "Multi-family building"}
          </strong>
          <small>
            {household.meter === "dwelling"
              ? "One dwelling"
              : household.meter === "building"
                ? "Whole-building meter"
                : "Communal services"}
            <span className="text-dot"> / </span>Demo profile
          </small>
        </div>
      </div>
      <div className="asset-summary-list">
        {ASSETS.map((asset) => {
          const Icon = ASSET_ICONS[asset.id];
          return (
            <div className="asset-summary" key={asset.id}>
              <Icon size={17} />
              <span>
                {asset.name}
                {household.assets[asset.id].shared && <small>Shared</small>}
              </span>
              <Status status={household.assets[asset.id].status} />
            </div>
          );
        })}
      </div>
      <button className="text-button edit-home-link" onClick={onEditHome}>
        Refine my household
        <ArrowRight size={16} />
      </button>
      <div className="solar-teaser">
        <img
          src="/solar-roof.jpg"
          alt="Illustrative solar installation, not the customer's property"
          width="960"
          height="639"
        />
        <div>
          <span className="eyebrow">OPTIONAL INVESTMENT</span>
          <h3>What could solar change?</h3>
          <button
            className="text-button"
            onClick={() => onOpenScenario("solar")}
          >
            Explore a scenario
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function Electricity({
  household,
  onEditHome,
  onOpenScenario,
  onAssumptions,
  onAsk,
  onConfirmEv,
  mode,
  onModeChange,
}: ViewActions & {
  onConfirmEv: (status: AssetStatus) => void;
  mode: "usage" | "impact";
  onModeChange: (mode: "usage" | "impact") => void;
}) {
  const result = simulate(household, scenarioFor("charging"));
  const current = result.current;
  const eveningShare = (current.gridWindowKwh / current.importKwh) * 100;
  return (
    <div className="page-body">
      <div className="view-tabs" role="tablist" aria-label="Electricity view">
        <button
          role="tab"
          aria-selected={mode === "usage"}
          onClick={() => onModeChange("usage")}
        >
          <Activity size={17} />
          My electricity
        </button>
        <button
          role="tab"
          aria-selected={mode === "impact"}
          onClick={() => onModeChange("impact")}
        >
          <Earth size={17} />
          My impact
        </button>
      </div>
      <div className="metrics-strip">
        <Metric
          label="Daily electricity cost"
          value={money(current.dailyCost, 2)}
          detail="Day & night / illustrative tariff"
          icon={Wallet}
          tone="amber"
        />
        <Metric
          label="Electricity from the grid"
          value={number(current.importKwh)}
          unit="kWh"
          detail="Representative day / demo readings"
          icon={PlugZap}
        />
        <Metric
          label="Use in the evening window"
          value={number(eveningShare, 0)}
          unit="%"
          detail="17:00-21:00 / example grid signal"
          icon={Network}
          tone="blue"
        />
        <Metric
          label="Electricity footprint"
          value={number(current.annualCarbon / EXAMPLE_DAYS)}
          unit="kg CO2e"
          detail="Daily estimate / illustrative factors"
          icon={Leaf}
        />
      </div>
      {mode === "impact" ? (
        <Impact
          {...{ household, onEditHome, onOpenScenario, onAssumptions, onAsk }}
          result={result}
        />
      ) : (
        <div className="analysis-layout">
          <section className="daily-analysis">
            <div className="section-heading chart-heading">
              <div>
                <span className="eyebrow">YOUR DAILY RHYTHM</span>
                <h2>Most of your flexibility starts with timing.</h2>
              </div>
              <Badge>15-min intervals</Badge>
            </div>
            <div className="chart-topline">
              <span className="chart-unit">Grid power (kW)</span>
              <span className="date-label">
                10 September 2026 / example day
              </span>
            </div>
            <PowerChart points={result.points} />
            <ChartLegend />
            <div className="insight-block">
              <div className="insight-symbol">
                <CarFront size={23} />
              </div>
              <div className="insight-content">
                <div className="insight-kicker">
                  A PATTERN WORTH EXPLORING
                  <Badge
                    tone={
                      household.assets.ev.status === "confirmed"
                        ? "green"
                        : "amber"
                    }
                  >
                    {household.assets.ev.status === "confirmed"
                      ? "Customer confirmed"
                      : "Observed pattern"}
                  </Badge>
                </div>
                <h3>
                  {household.assets.ev.status === "confirmed"
                    ? "Your evening charge could happen later."
                    : household.assets.ev.status === "absent" ||
                        household.assets.ev.status === "unknown"
                      ? "Your evening peak is still worth understanding."
                      : "Could that evening peak be your car?"}
                </h3>
                <p>
                  {household.assets.ev.status === "confirmed"
                    ? `The assumed ${CHARGING_ENERGY} kWh charge can move out of the evening window. On your current example tariff, that is ${money(result.annualSavings)} a year in a repeating-day scenario.`
                    : household.assets.ev.status === "absent" ||
                        household.assets.ev.status === "unknown"
                      ? "We have left the load unassigned. Your original readings stay the same; no EV-charging saving is assumed."
                      : "Between 18:00 and 20:00, there is a sustained rise of about 3.6 kW. EV charging is one possible explanation, not a certainty."}
                </p>
                <div className="insight-actions">
                  {household.assets.ev.status === "inferred" ? (
                    <>
                      <button
                        className="button primary small"
                        onClick={() => onConfirmEv("confirmed")}
                      >
                        <Check size={16} />
                        Yes, that is charging
                      </button>
                      <button
                        className="button secondary small"
                        onClick={() => onConfirmEv("absent")}
                      >
                        No electric car
                      </button>
                      <button
                        className="text-button"
                        onClick={() => onConfirmEv("unknown")}
                      >
                        Not sure
                      </button>
                    </>
                  ) : household.assets.ev.status === "confirmed" ? (
                    <button
                      className="button primary small"
                      onClick={() => onOpenScenario("charging")}
                    >
                      Compare a later charge
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      className="button secondary small"
                      onClick={onEditHome}
                    >
                      Review my equipment
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="question-strip">
              <MessageCircle size={19} />
              <span>Why does the time I use electricity matter?</span>
              <button
                className="text-button"
                onClick={() =>
                  onAsk("Why does the time I use electricity matter?")
                }
              >
                Ask the guide
                <ArrowRight size={15} />
              </button>
            </div>
            <button className="source-link" onClick={onAssumptions}>
              <Info size={13} />
              Illustrative readings, rates and grid signals. View assumptions.
            </button>
          </section>
          <HouseholdSnapshot {...{ household, onEditHome, onOpenScenario }} />
        </div>
      )}
    </div>
  );
}

function Impact({
  result,
  onEditHome,
  onOpenScenario,
  onAssumptions,
}: ViewActions & { result: Result }) {
  const [participants, setParticipants] = useState(100);
  const possible = result.feasible;
  return (
    <div className="impact-layout">
      <section className="impact-main">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MY IMPACT</span>
            <h2>Your household is part of a bigger picture.</h2>
          </div>
          <Earth className="impact-earth" size={34} />
        </div>
        <div className="impact-explanation">
          <p>
            What you pay, how busy the local grid is, and the emissions
            associated with electricity are different things. A cheaper hour is
            not automatically a cleaner one.
          </p>
          <Badge tone="blue">Current use + estimated effects</Badge>
        </div>
        <div className="impact-measures">
          <div>
            <Leaf size={23} />
            <span>Current electricity footprint</span>
            <strong>
              {number(result.current.annualCarbon / 1000, 2)}
              <small>tonnes CO2e / year</small>
            </strong>
            <p>
              Illustrative operational electricity estimate, not your total
              household or life-cycle footprint.
            </p>
          </div>
          <div>
            <Network size={23} />
            <span>Electricity in the evening window</span>
            <strong>
              {number(result.current.gridWindowKwh)}
              <small>kWh / representative day</small>
            </strong>
            <p>
              Use during the example 17:00-21:00 pressure window. This is not a
              measurement of network congestion.
            </p>
          </div>
        </div>
        <div className="impact-change">
          <div className="section-heading">
            <h3>What a later charge could change</h3>
            <Badge tone={possible ? "green" : "amber"}>
              {possible ? "Scenario estimate" : "Needs confirmation"}
            </Badge>
          </div>
          <div className="impact-change-values">
            <div>
              <span>Evening-window energy</span>
              <strong>
                {possible
                  ? `${number(result.gridWindowChange)} kWh less`
                  : "Not estimated"}
              </strong>
            </div>
            <div>
              <span>Estimated annual footprint</span>
              <strong>
                {possible
                  ? `${number(result.annualCarbonChange, 0)} kg CO2e lower`
                  : "Not estimated"}
              </strong>
            </div>
          </div>
          <p>
            {possible
              ? "The same charging energy moves to another time. The footprint difference uses illustrative time-varying factors; it is not verified avoided emissions."
              : "The evening load has not been confirmed as EV charging. We will not assign it a flexibility or emissions saving."}
          </p>
          <button
            className="text-button"
            onClick={possible ? () => onOpenScenario("charging") : onEditHome}
          >
            {possible ? "Compare this change" : "Confirm my equipment"}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
      <aside className="collective-panel">
        <span className="eyebrow">A COLLECTIVE WHAT-IF</span>
        <h2>
          Small changes.
          <br />
          Shared possibilities.
        </h2>
        <p>
          If similar households made the same change, what could the combined
          effect look like?
        </p>
        <label className="collective-control">
          Participating households<output>{number(participants, 0)}</output>
          <input
            aria-label="Participating households"
            type="range"
            min={10}
            max={1000}
            step={10}
            value={participants}
            onChange={(event) => setParticipants(Number(event.target.value))}
          />
        </label>
        <div className="range-ends">
          <span>10</span>
          <span>1,000</span>
        </div>
        <div className="collective-result">
          <Network size={22} />
          <strong data-testid="collective-energy">
            {possible
              ? number(result.gridWindowChange * participants, 0)
              : "--"}
            <small>kWh</small>
          </strong>
          <span>less use in the evening window</span>
        </div>
        <div className="collective-footprint">
          <Leaf size={17} />
          <span>
            {possible
              ? `${number((result.annualCarbonChange * participants) / 1000)} tonnes CO2e`
              : "Footprint change not estimated"}
            <small>annual modelled footprint difference</small>
          </span>
        </div>
        <p className="fine-print">
          Assumes {number(participants, 0)} comparable households repeat this
          schedule. Not an observed community result, network forecast or claim
          of avoided grid investment.
        </p>
        <button className="source-link" onClick={onAssumptions}>
          <Info size={14} />
          Sources and calculation boundaries
        </button>
      </aside>
    </div>
  );
}

export function Opportunities({
  household,
  onOpenScenario,
  onEditHome,
  onAssumptions,
}: ViewActions) {
  const [filter, setFilter] = useState("all");
  const options = opportunitiesFor(household).filter(
    (option) =>
      filter === "all" ||
      (filter === "investment"
        ? option.category === "investment"
        : option.category !== "investment"),
  );
  return (
    <div className="page-body">
      <div className="opportunity-toolbar">
        <div
          className="segmented"
          role="tablist"
          aria-label="Opportunity category"
        >
          {[
            ["all", "All options"],
            ["routine", "No investment"],
            ["investment", "Home investments"],
          ].map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="muted">Financial benefit first / comfort always</span>
      </div>
      <div className="opportunity-grid">
        {options.map((option) => {
          const Icon = SCENARIO_ICONS[option.kind];
          const result = option.result;
          const expense = result.annualSavings < 0;
          return (
            <article
              className={`opportunity-card opportunity-${option.kind}`}
              key={option.kind}
            >
              <div className="opportunity-top">
                <span
                  className={`opportunity-icon ${option.category === "investment" ? "amber" : ""}`}
                >
                  <Icon size={25} />
                </span>
                <Badge
                  tone={
                    !result.feasible
                      ? "amber"
                      : option.category === "investment"
                        ? "blue"
                        : "green"
                  }
                >
                  {!result.feasible
                    ? "Confirm equipment"
                    : option.category === "investment"
                      ? "Optional investment"
                      : option.category === "grid"
                        ? "Network need first"
                        : "No investment"}
                </Badge>
              </div>
              <h2>{option.title}</h2>
              <p className="opportunity-description">{option.description}</p>
              <div
                className={`opportunity-value ${expense ? "cost-increase" : ""}`}
              >
                {result.feasible ? (
                  <>
                    <strong>{money(Math.abs(result.annualSavings))}</strong>
                    <span>
                      / year {expense ? "additional cost" : "estimated saving"}
                    </span>
                  </>
                ) : (
                  <strong className="pending-value">Confirm to estimate</strong>
                )}
              </div>
              {result.capitalCost > 0 && (
                <p className="investment-cost">
                  Illustrative upfront cost:{" "}
                  <strong>{money(result.capitalCost)}</strong>
                </p>
              )}
              <div className="opportunity-details">
                <span>
                  <Clock3 size={15} />
                  {option.effort}
                </span>
                <span>
                  <Network size={15} />
                  {!result.feasible
                    ? "Grid effect unconfirmed"
                    : result.gridWindowChange > 0.05
                      ? `${number(result.gridWindowChange)} kWh less in evening`
                      : result.gridWindowChange < -0.05
                        ? "More draw in evening"
                        : "Evening draw unchanged"}
                </span>
              </div>
              {result.needsApproval && (
                <div className="approval-note">
                  <Building2 size={14} />
                  Building approval needed
                </div>
              )}
              <button
                className="button secondary opportunity-action"
                onClick={() => onOpenScenario(option.kind)}
              >
                {result.feasible
                  ? "Compare this option"
                  : "Review this possibility"}
                <ArrowUpRight size={17} />
              </button>
            </article>
          );
        })}
      </div>
      <div className="option-context">
        <div>
          <h3>Equipment is only part of the story.</h3>
          <p>
            Heat, hot water, appliances and lighting have different limits.
            Their available flexibility needs comfort, timing and control
            information; no universal saving is assumed.
          </p>
        </div>
        <button className="button secondary" onClick={onEditHome}>
          <Pencil size={16} />
          Review household
        </button>
      </div>
      <button className="source-link" onClick={onAssumptions}>
        <Info size={13} />
        Annualised demo estimates, not verified tariffs, quotes or eligibility
        decisions.
      </button>
    </div>
  );
}

export function Comparison({
  household,
  scenario,
  onChangeScenario,
  onSave,
  onEditHome,
  onAssumptions,
}: ViewActions & {
  scenario: Scenario;
  onChangeScenario: (update: Partial<Scenario>) => void;
  onSave: () => void;
}) {
  const result = simulate(household, scenario);
  const investment = result.capitalCost > 0;
  const selectedTariff = TARIFFS.find(
    (tariff) => tariff.id === scenario.tariff,
  )!;
  const rows = [
    {
      name: "Current use + current tariff",
      cost: result.current.annualCost,
      detail: "Your baseline",
    },
    {
      name: "Current use + selected tariff",
      cost: result.tariffOnly.annualCost,
      detail: "Tariff change only",
    },
    {
      name: "Proposed use + current tariff",
      cost: result.behaviourOnly.annualCost,
      detail: "Usage change only",
    },
    {
      name: "Proposed use + selected tariff",
      cost: result.proposed.annualCost,
      detail: "Combined scenario",
    },
  ];
  function downloadComparison() {
    const csv = [
      "time,current_grid_kw,scenario_grid_kw,source",
      ...result.points.map(
        (point) =>
          `${point.time},${point.observed.toFixed(4)},${point.proposed.toFixed(4)},illustrative`,
      ),
    ].join("\n");
    downloadText("ekz-illustrative-comparison.csv", csv, "text/csv");
  }
  return (
    <div className="page-body">
      <div className="comparison-toolbar">
        <label className="scenario-select">
          <SlidersHorizontal size={18} />
          <select
            aria-label="Comparison type"
            value={scenario.kind}
            onChange={(event) =>
              onChangeScenario({ kind: event.target.value as ScenarioKind })
            }
          >
            {Object.entries(SCENARIO_NAMES).map(([kind, name]) => (
              <option value={kind} key={kind}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <Badge tone="amber">Illustrative calculation</Badge>
      </div>
      {!result.feasible && (
        <div className="notice warning" role="alert">
          <Info size={19} />
          <span>{result.reason}</span>
          <button className="text-button" onClick={onEditHome}>
            Review household
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      {result.needsApproval && (
        <div className="notice">
          <Building2 size={18} />
          <span>
            This is a building-level discussion, not permission to control
            shared equipment. Your next step will be an assessment.
          </span>
        </div>
      )}
      <div className="comparison-layout">
        <aside className="scenario-controls">
          <h2>Your scenario</h2>
          <label>
            Selected tariff
            <select
              aria-label="Selected tariff"
              value={scenario.tariff}
              onChange={(event) =>
                onChangeScenario({ tariff: event.target.value as TariffId })
              }
            >
              {TARIFFS.map((tariff) => (
                <option key={tariff.id} value={tariff.id}>
                  {tariff.name}
                  {tariff.id === CURRENT_TARIFF ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="control-caption">
            {selectedTariff.description}
            <br />
            Standing charge {money(selectedTariff.monthlyFee, 2)} / month
          </p>
          {scenario.kind === "charging" && (
            <>
              <div className="control-divider" />
              <h3>Keep the morning ready</h3>
              <label>
                Charging starts
                <select
                  aria-label="Charging starts"
                  value={scenario.startHour}
                  onChange={(event) =>
                    onChangeScenario({ startHour: Number(event.target.value) })
                  }
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option key={hour} value={hour}>
                      {hourLabel(hour)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ready by
                <select
                  aria-label="Ready by"
                  value={scenario.readyHour}
                  onChange={(event) =>
                    onChangeScenario({ readyHour: Number(event.target.value) })
                  }
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option key={hour} value={hour}>
                      {hourLabel(hour)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="constraint-facts">
                <span>
                  Assumed daily charge<strong>{CHARGING_ENERGY} kWh</strong>
                </span>
                <span>
                  Charger limit
                  <strong>{number(household.assets.ev.capacity)} kW</strong>
                </span>
                <span>
                  Vehicle discharge<strong>Not assumed</strong>
                </span>
              </div>
              <button className="text-button" onClick={onEditHome}>
                Edit charger details
                <Pencil size={14} />
              </button>
            </>
          )}
          {scenario.kind === "solar" && (
            <>
              <div className="control-divider" />
              <label className="range-label">
                Additional solar<output>{number(scenario.solarKwp)} kWp</output>
                <input
                  aria-label="Additional solar capacity"
                  type="range"
                  min={1}
                  max={12}
                  step={0.5}
                  value={scenario.solarKwp}
                  onChange={(event) =>
                    onChangeScenario({ solarKwp: Number(event.target.value) })
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={scenario.withBattery}
                  onChange={(event) =>
                    onChangeScenario({ withBattery: event.target.checked })
                  }
                />
                Add a battery
              </label>
              <p className="control-caption">
                Illustrative daylight profile. Roof suitability and generation
                data are not established.
              </p>
            </>
          )}
          {(scenario.kind === "battery" ||
            (scenario.kind === "solar" && scenario.withBattery)) && (
            <>
              <div className="control-divider" />
              <label className="range-label">
                Additional battery
                <output>{number(scenario.batteryKwh)} kWh</output>
                <input
                  aria-label="Additional battery capacity"
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={scenario.batteryKwh}
                  onChange={(event) =>
                    onChangeScenario({ batteryKwh: Number(event.target.value) })
                  }
                />
              </label>
              <div className="constraint-facts">
                <span>
                  Power limit<strong>3 kW</strong>
                </span>
                <span>
                  Round-trip efficiency<strong>90%</strong>
                </span>
                <span>
                  Daily cycle<strong>Empty to empty</strong>
                </span>
              </div>
            </>
          )}
          {scenario.kind === "curtail" && (
            <>
              <div className="control-divider" />
              <label className="range-label">
                Reduce PV output<output>{scenario.curtailment}%</output>
                <input
                  aria-label="PV curtailment"
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={scenario.curtailment}
                  onChange={(event) =>
                    onChangeScenario({
                      curtailment: Number(event.target.value),
                    })
                  }
                />
              </label>
              <p className="control-caption">
                11:00-15:00 only. Output can be reduced, not raised above
                available sunlight. Generation is assumed, not metered. No
                compensation is included.
              </p>
            </>
          )}
          {scenario.kind === "tariff" && (
            <div className="tariff-note">
              <Wallet size={25} />
              <h3>Same use. A different price.</h3>
              <p>
                Changing tariffs alone does not change your electricity
                footprint or grid demand.
              </p>
            </div>
          )}
          <div className="control-divider" />
          <button className="source-link" onClick={onAssumptions}>
            <Info size={14} />
            All data and assumptions
          </button>
        </aside>
        <section className="scenario-results">
          <div className="scenario-summary">
            <div>
              <span>
                {result.annualSavings >= 0
                  ? "Estimated annual saving"
                  : "Estimated annual extra cost"}
              </span>
              <strong
                className={result.annualSavings < 0 ? "cost-increase" : ""}
              >
                {result.feasible
                  ? money(Math.abs(result.annualSavings))
                  : "Not estimated"}
              </strong>
              <small>Representative day repeated 365 times</small>
            </div>
            <div>
              <span>Evening-window energy</span>
              <strong>
                {result.feasible
                  ? `${number(Math.abs(result.gridWindowChange))} kWh`
                  : "--"}
              </strong>
              <small>
                {result.gridWindowChange > 0.05
                  ? "less per example day"
                  : result.gridWindowChange < -0.05
                    ? "more per example day"
                    : "no change to evening draw"}
              </small>
            </div>
          </div>
          <div className="section-heading comparison-chart-heading">
            <h3>Same day. Different possibilities.</h3>
            <IconButton
              icon={Download}
              label="Download comparison CSV"
              onClick={downloadComparison}
            />
          </div>
          <span className="chart-unit">
            Grid power (kW) / below zero is export
          </span>
          <PowerChart points={result.points} comparison />
          <ChartLegend comparison />
          <div className="cost-table-wrap">
            <table className="cost-table">
              <caption>Keep tariff and usage effects separate</caption>
              <thead>
                <tr>
                  <th scope="col">Scenario</th>
                  <th scope="col">Annual cost</th>
                  <th scope="col">Saving vs baseline</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.name}
                    className={index === 3 ? "selected-result" : ""}
                  >
                    <th scope="row">
                      {row.name}
                      <small>{row.detail}</small>
                    </th>
                    <td>
                      {index >= 2 && !result.feasible ? "--" : money(row.cost)}
                    </td>
                    <td>
                      {index === 0
                        ? "Baseline"
                        : index >= 2 && !result.feasible
                          ? "--"
                          : `${result.current.annualCost - row.cost < 0 ? "-" : ""}${money(Math.abs(result.current.annualCost - row.cost))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {investment && (
            <div className="investment-summary">
              <div>
                <span>Indicative upfront cost</span>
                <strong>
                  {money(result.capitalCost * 0.8)}-
                  {money(result.capitalCost * 1.2)}
                </strong>
              </div>
              <div>
                <span>Illustrative simple payback</span>
                <strong>
                  {result.payback
                    ? `${number(result.payback * 0.8, 1)}-${number(result.payback * 1.2, 1)} years`
                    : "No positive payback"}
                </strong>
              </div>
              <p>
                Range varies capital cost by 20%. No grants, financing,
                maintenance, degradation or seasonal forecast included. Not an
                installation quote.
              </p>
            </div>
          )}
          <details className="calculation-notes">
            <summary>Calculation boundaries</summary>
            <p>
              All tariffs, generation, carbon factors and network windows are
              illustrative. Annual figures repeat this day 365 times; they are
              not a seasonal forecast. Bills include energy charges, the stated
              standing charge and an assumed export payment of CHF 0.08/kWh.
              Actual charges and eligibility must be verified.
            </p>
            <p>
              Grid effects refer only to the example time window. Emissions are
              accounting estimates, not proven avoided emissions. A charging
              shift keeps 7.2 kWh constant; a battery includes 10% round-trip
              losses. Combined assets share one energy balance.
            </p>
          </details>
          <div className="save-scenario">
            <span>
              <Check size={16} />
              No device or contract changes
            </span>
            <button
              className="button primary"
              disabled={!result.feasible}
              onClick={onSave}
            >
              {result.needsApproval || investment
                ? "Save assessment plan"
                : "Save my next step"}
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function tasksFor(plan: SavedPlan, approval: boolean) {
  if (approval)
    return [
      "Confirm who owns and controls the equipment",
      "Discuss the scenario with the building manager",
      "Request property-specific costs and permission before acting",
    ];
  if (plan.scenario.kind === "charging")
    return [
      "Confirm the charger supports a reliable timer",
      `Try charging from ${hourLabel(plan.scenario.startHour)}, ready by ${hourLabel(plan.scenario.readyHour)}`,
      "Keep a manual override for unexpected journeys",
    ];
  if (plan.scenario.kind === "tariff")
    return [
      "Verify actual tariff rates, eligibility and all charges with EKZ",
      "Check the current contract and any change fees",
      "Decide whether to proceed with a real tariff application",
    ];
  if (plan.scenario.kind === "curtail")
    return [
      "Verify the actual network request and any compensation",
      "Confirm inverter control capability and generation data",
      "Agree the limits before allowing any curtailment",
    ];
  return [
    "Check property suitability and permission to install",
    "Request a property-specific quote and generation or storage assessment",
    "Compare full life-cycle costs before making an investment",
  ];
}

export function NextStep({
  plan,
  household,
  onUpdate,
  onRecompare,
  onExplore,
  onRemove,
}: {
  plan: SavedPlan | null;
  household: Household;
  onUpdate: (update: Partial<Pick<SavedPlan, "checked" | "notes">>) => void;
  onRecompare: (scenario: Scenario) => void;
  onExplore: () => void;
  onRemove: () => void;
}) {
  const [notes, setNotes] = useState(plan?.notes ?? "");
  if (!plan)
    return (
      <div className="empty-plan page-body">
        <ListChecks size={44} strokeWidth={1.5} />
        <h2>No next step chosen yet.</h2>
        <p>
          A useful next step should fit your home, your routine and your budget.
        </p>
        <button className="button primary" onClick={onExplore}>
          Explore my opportunities
          <ArrowRight size={17} />
        </button>
      </div>
    );
  const result = simulate(plan.household, plan.scenario);
  const stale = JSON.stringify(household) !== JSON.stringify(plan.household);
  const tasks = tasksFor(plan, result.needsApproval);
  const completed = tasks.filter((task) => plan.checked.includes(task)).length;
  function downloadPlan() {
    if (!plan) return;
    downloadText(
      "my-ekz-next-step.md",
      `# My next step\n\n${SCENARIO_NAMES[plan.scenario.kind]}\n\nIllustrative draft, not an instruction sent to a device or provider.\n${stale ? "\nHousehold assumptions have changed. Recompare before relying on this draft.\n" : ""}\nEstimated annual cost: ${money(result.proposed.annualCost)}\nEstimated annual saving: ${money(result.annualSavings)}\nUpfront investment assumption: ${money(result.capitalCost)}\nTariff: ${TARIFFS.find((tariff) => tariff.id === plan.scenario.tariff)!.name} (illustrative)\n\n## Checklist\n${tasks.map((task) => `- [${plan.checked.includes(task) ? "x" : " "}] ${task}`).join("\n")}\n\n## Notes\n${notes}\n\n## Assumptions\nA representative day is repeated 365 times. Rates, equipment capacities, solar output, carbon factors and network windows are illustrative. Battery round-trip efficiency is 90%. Actual eligibility, comfort, control rights and investment costs need verification. No measured savings, guaranteed grid benefit or avoided-emissions claim is made.\n`,
      "text/markdown",
    );
  }
  return (
    <div className="page-body next-step-page">
      {stale && (
        <div className="notice warning" role="alert">
          <Info size={18} />
          <span>
            Your household details changed. Recompare before relying on this
            saved plan.
          </span>
          <button
            className="text-button"
            onClick={() => onRecompare(plan.scenario)}
          >
            Recompare
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      <div className="plan-heading">
        <div>
          <Badge tone="green">
            {result.needsApproval || result.capitalCost > 0
              ? "Assessment plan"
              : plan.scenario.kind === "charging"
                ? "Personal trial"
                : "Decision plan"}
          </Badge>
          <h2>{SCENARIO_NAMES[plan.scenario.kind]}</h2>
          <p>Saved draft / no automatic changes or enrollment</p>
        </div>
        <span className="plan-stamp">
          <ListChecks size={32} />
        </span>
      </div>
      <div className="plan-metrics">
        <Metric
          label={
            result.annualSavings >= 0
              ? "Estimated annual saving"
              : "Estimated annual extra cost"
          }
          value={money(Math.abs(result.annualSavings))}
          detail="Repeating-day scenario, not a promise"
          icon={Wallet}
          tone="amber"
        />
        <Metric
          label="Example grid effect"
          value={number(Math.abs(result.gridWindowChange))}
          unit="kWh"
          detail={
            result.gridWindowChange > 0
              ? "Less energy in the evening window"
              : result.gridWindowChange < 0
                ? "More energy in the evening window"
                : "No change in evening-window energy"
          }
          icon={Network}
          tone="blue"
        />
        <Metric
          label="Your control"
          value={result.needsApproval ? "Approval first" : "Your decision"}
          detail={
            result.needsApproval
              ? "Shared equipment or installation rights"
              : "Nothing has been sent to a device"
          }
          icon={Check}
        />
      </div>
      <div className="plan-layout">
        <section>
          <div className="section-heading">
            <h3>A practical next step</h3>
            <span className="muted">
              {completed} of {tasks.length} checked
            </span>
          </div>
          <div className="plan-checklist">
            {tasks.map((task) => (
              <label
                key={task}
                className={plan.checked.includes(task) ? "task-complete" : ""}
              >
                <input
                  type="checkbox"
                  disabled={stale}
                  checked={plan.checked.includes(task)}
                  onChange={(event) =>
                    onUpdate({
                      checked: event.target.checked
                        ? [...plan.checked, task]
                        : plan.checked.filter((item) => item !== task),
                    })
                  }
                />
                <span>{task}</span>
              </label>
            ))}
          </div>
          <label className="plan-notes">
            Notes for myself
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Questions, constraints, or something to check..."
              rows={4}
            />
          </label>
          <button
            className="button secondary small"
            onClick={() => onUpdate({ notes })}
          >
            <Check size={15} />
            Save notes
          </button>
        </section>
        <aside className="plan-context">
          <Leaf size={25} />
          <h3>Why this could matter</h3>
          <p>
            {result.gridWindowChange > 0.05
              ? "Less demand during the example evening window can help when that window matches a real network constraint. It does not automatically translate into a measured grid saving."
              : "This option may change your bill without reducing evening demand. Financial value and grid value should stay separate."}
          </p>
          <p className="fine-print">
            A later review needs actual post-change readings and a suitable
            baseline. Results tracking is not connected.
          </p>
          <button
            className="text-button"
            onClick={() => onRecompare(plan.scenario)}
          >
            Revisit the comparison
            <ArrowRight size={16} />
          </button>
        </aside>
      </div>
      <div className="plan-footer">
        <button className="button secondary" onClick={downloadPlan}>
          <Download size={17} />
          Download my plan
        </button>
        <button className="text-button danger" onClick={onRemove}>
          <Trash2 size={16} />
          Delete draft
        </button>
      </div>
    </div>
  );
}
