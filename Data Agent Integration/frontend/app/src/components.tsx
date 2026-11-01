import { useEffect, useId, useRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
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
import { Check, CircleHelp, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { hourLabel, number } from "./model";
import type { AssetStatus, ScenarioPoint } from "./model";

export function IconButton({
  icon: Icon,
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      data-tooltip={label}
      {...props}
    >
      <Icon size={19} strokeWidth={1.8} />
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "blue";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Status({ status }: { status: AssetStatus }) {
  const labels: Record<AssetStatus, string> = {
    confirmed: "Confirmed",
    inferred: "To confirm",
    absent: "Not installed",
    unknown: "Not sure",
  };
  return (
    <span className={`asset-status ${status}`}>
      {status === "confirmed" ? (
        <Check size={12} />
      ) : status === "inferred" ? (
        <CircleHelp size={12} />
      ) : null}
      {labels[status]}
    </span>
  );
}

export function Metric({
  label,
  value,
  unit,
  detail,
  icon: Icon,
  tone = "green",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  detail: string;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <div className="metric-label">
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <div className="metric-value">
        {value}
        {unit && <span>{unit}</span>}
      </div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}

export function PowerChart({
  points,
  comparison = false,
}: {
  points: ScenarioPoint[];
  comparison?: boolean;
}) {
  return (
    <div
      className="power-chart"
      data-testid="power-chart"
      aria-label={
        comparison
          ? "Current and proposed grid power over 24 hours, in kilowatts"
          : "Illustrative 15-minute grid import over 24 hours, in kilowatts"
      }
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart
          data={points}
          margin={{ top: 16, right: 14, left: -12, bottom: 2 }}
          accessibilityLayer
        >
          <CartesianGrid
            stroke="#e6ece8"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="hour"
            type="number"
            domain={[0, 24]}
            ticks={[0, 6, 12, 18, 24]}
            tickFormatter={hourLabel}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#6b7972", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            width={48}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#6b7972", fontSize: 11 }}
            domain={comparison ? ["auto", "auto"] : [0, "auto"]}
          />
          <Tooltip
            formatter={(value) => `${number(Number(value), 2)} kW`}
            labelFormatter={(label) => hourLabel(Number(label))}
            contentStyle={{
              border: "1px solid #dce4de",
              borderRadius: 6,
              fontSize: 12,
              boxShadow: "0 6px 18px #203c2310",
            }}
          />
          <ReferenceArea x1={17} x2={21} fill="#efbd67" fillOpacity={0.18} />
          <ReferenceLine y={0} stroke="#c6d2ca" />
          <Area
            type="stepAfter"
            dataKey="observed"
            name="Current usage"
            stroke={comparison ? "#96a69d" : "#217556"}
            strokeWidth={comparison ? 1.5 : 2.3}
            strokeDasharray={comparison ? "4 3" : undefined}
            fill={comparison ? "#e9eeeb" : "#d9eadf"}
            fillOpacity={0.7}
            isAnimationActive={false}
          />
          {comparison && (
            <Line
              type="stepAfter"
              dataKey="proposed"
              name="Your scenario"
              stroke="#197655"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ comparison = false }: { comparison?: boolean }) {
  return (
    <div className="chart-legend">
      <span>
        <i className={comparison ? "legend-line muted" : "legend-line"} />
        {comparison ? "Current usage" : "Grid import"}
      </span>
      {comparison && (
        <span>
          <i className="legend-line" />
          Your scenario
        </span>
      )}
      <span>
        <i className="legend-window" />
        Example grid-pressure window
      </span>
    </div>
  );
}

export function Dialog({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const active = document.activeElement;
    if (active instanceof HTMLElement && !dialog?.contains(active)) {
      returnFocusRef.current = active;
    }
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={`dialog ${className}`}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])',
        )).filter((element) => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first && last) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last && first) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <IconButton icon={X} label="Close dialog" onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
