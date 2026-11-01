import { useId, useState } from "react";
import { ArrowRight, Clock3, Coins } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  actionBlockReason,
  actionPreview,
  ENERGY_ACTIONS,
} from "./energyStory";
import { ASSETS, hourLabel, number } from "./model";
import type { AssetId, Household } from "./model";

export function MomentumChart({
  household,
  onEditHome,
}: {
  household: Household;
  onEditHome: () => void;
}) {
  const [selected, setSelected] = useState<AssetId | null>(null);
  const syncId = useId();
  const available = ENERGY_ACTIONS.filter(
    (action) => !actionBlockReason(household, action),
  );
  const action = available.find((item) => item.id === selected) ?? available[0];
  if (!action)
    return (
      <div className="momentum-empty">
        <Clock3 size={30} />
        <h4>A little more about your home first.</h4>
        <p>No flexible equipment is confirmed for you to control yet.</p>
        <button className="button secondary" onClick={onEditHome}>
          Update my household
          <ArrowRight size={16} />
        </button>
      </div>
    );
  const preview = actionPreview(household, action);
  return (
    <section className="momentum-timing" aria-label="Your timing comparison">
      <div className="momentum-chart-controls">
        <div className="momentum-chart-legend">
          <span>
            <i className="before" />
            Before
          </span>
          <span>
            <i className="after" />
            After your move
          </span>
        </div>
        <label>
          Flexibility
          <select
            aria-label="Chart flexibility"
            value={action.id}
            onChange={(event) => setSelected(event.target.value as AssetId)}
          >
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {ASSETS.find((asset) => asset.id === item.id)?.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="momentum-chart-title">
        <strong>Electricity from the grid</strong>
        <span>kW</span>
      </div>
      <div
        className="momentum-power-chart"
        data-testid="momentum-power-chart"
        aria-label="Electricity before and after the action. Coloured areas show the difference."
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={preview.points}
            syncId={syncId}
            margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid
              stroke="#e6ece9"
              vertical={false}
              strokeDasharray="3 4"
            />
            <XAxis dataKey="hour" type="number" domain={[0, 24]} hide />
            <YAxis
              width={35}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#75847d", fontSize: 11 }}
              tickCount={4}
            />
            <Tooltip
              labelFormatter={(value) => hourLabel(Number(value))}
              formatter={(value) => `${number(Number(value), 2)} kW`}
              contentStyle={{
                border: "1px solid #d4e1d9",
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <ReferenceLine y={0} stroke="#c7d8ce" />
            <Area
              name="Less at the peak"
              type="stepAfter"
              dataKey="reduced"
              stroke="none"
              fill="#72c5a6"
              fillOpacity={0.55}
              tooltipType="none"
              isAnimationActive={false}
            />
            <Area
              name="Moved to a better time"
              type="stepAfter"
              dataKey="shifted"
              stroke="none"
              fill="#9fc8e9"
              fillOpacity={0.6}
              tooltipType="none"
              isAnimationActive={false}
            />
            <Line
              name="Before"
              type="stepAfter"
              dataKey="before"
              stroke="#8a969c"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              name="After your move"
              type="stepAfter"
              dataKey="after"
              stroke="#20846c"
              strokeWidth={2.7}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="momentum-difference-key">
        <span>
          <i className="less" />
          Less at the peak
        </span>
        {action.to !== null && (
          <span>
            <i className="moved" />
            {action.id === "solar"
              ? "More of your own solar"
              : "Moved to a cheaper time"}
          </span>
        )}
      </div>
      <div className="momentum-chart-title tariff-title">
        <strong>Dynamic tariff</strong>
        <span>rp / kWh</span>
      </div>
      <div
        className="momentum-tariff-chart"
        data-testid="momentum-tariff-chart"
        aria-label="Illustrative dynamic tariff: 17 to 42 rappen per kilowatt-hour, highest from 17:00 to 21:00."
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={preview.points}
            syncId={syncId}
            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            accessibilityLayer
          >
            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 24]}
              ticks={[0, 6, 12, 18, 24]}
              tickFormatter={hourLabel}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#75847d", fontSize: 10 }}
              dy={5}
            />
            <YAxis
              width={35}
              domain={[0, 50]}
              ticks={[17, 42]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9b7929", fontSize: 10 }}
            />
            <ReferenceArea x1={17} x2={21} fill="#f6e6b6" fillOpacity={0.5} />
            <Tooltip
              labelFormatter={(value) => hourLabel(Number(value))}
              formatter={(value) => `${value} rp/kWh`}
              contentStyle={{
                border: "1px solid #e4d7b3",
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Area
              name="Dynamic tariff"
              type="stepAfter"
              dataKey="price"
              stroke="#c49b32"
              strokeWidth={2}
              fill="#f4d987"
              fillOpacity={0.26}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="momentum-timing-result">
        <span>
          <Clock3 size={17} />
          {hourLabel(action.from)}
          {action.to !== null ? (
            <>
              <ArrowRight size={15} />
              {hourLabel(action.to)}
            </>
          ) : (
            " / use less"
          )}
        </span>
        <strong>
          <Coins size={19} />
          CHF {number(preview.savedCents / 100, 2)} less per demo action
        </strong>
      </div>
      <p className="momentum-fine-print">
        Illustrative day, not your meter readings.{" "}
        {action.id === "battery"
          ? "Battery charging includes 10% energy loss."
          : action.id === "solar"
            ? "Solar savings include forgone export income."
            : action.to === null
              ? "Unused lighting is switched off, not shifted."
              : `${number(preview.energyKwh, 2)} kWh shifted; the amount of energy stays the same.`}
      </p>
    </section>
  );
}
