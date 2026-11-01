import { useId, useState } from "react";
import { Building2, Check, House, X } from "lucide-react";
import { ASSETS } from "./model";
import type { AssetId, Household } from "./model";
import { ENERGY_ACTIONS } from "./energyStory";

export function Lumi({ celebrating = false }: { celebrating?: boolean }) {
  return (
    <svg
      className={`momentum-lumi ${celebrating ? "celebrating" : ""}`}
      viewBox="0 0 100 110"
      role="img"
      aria-label="Lumi, your energy sprite"
    >
      <g
        className="lumi-wings"
        fill="#f7d46a"
        stroke="#ca9f36"
        strokeWidth="1.5"
      >
        <path d="M29 59C4 34 1 62 22 77L36 78Z" />
        <path d="M71 59C96 34 99 62 78 77L64 78Z" />
      </g>
      <path d="M26 88 22 102 40 97m34-9 4 14-18-5" fill="#238678" />
      <path
        d="M24 51 21 24 39 36Q50 27 61 36L80 24 76 51C94 80 74 98 50 98S6 80 24 51Z"
        fill="#78cbb7"
        stroke="#297b70"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M34 37 29 32 30 46m40 0 1-14-7 5" fill="#d0efe1" />
      <ellipse cx="50" cy="79" rx="23" ry="15" fill="#d4f0df" />
      <path
        d="m54 8-14 19h10l-4 15 17-22H53Z"
        fill="#f5c84c"
        stroke="#c99824"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <g fill="#1e514b">
        <ellipse cx="37" cy="59" rx="3" ry={celebrating ? 2 : 4} />
        <ellipse cx="63" cy="59" rx="3" ry={celebrating ? 2 : 4} />
      </g>
      <g fill="#ec9c86">
        <ellipse cx="29" cy="68" rx="5" ry="3" />
        <ellipse cx="71" cy="68" rx="5" ry="3" />
      </g>
      <path
        d="M44 69q6 7 12 0"
        fill="none"
        stroke="#1e514b"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 74 12 69m68 5 8-5"
        fill="none"
        stroke="#297b70"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MomentumGuide({
  message,
  topic,
}: {
  message: string;
  topic: string;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const tipId = useId();
  return (
    <div
      className="momentum-guide"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          setPinned(false);
        }
      }}
    >
      <button
        className="momentum-guide-trigger"
        aria-label={`Ask Lumi about ${topic}`}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (
            !event.currentTarget.parentElement?.contains(event.relatedTarget)
          ) {
            setOpen(false);
            setPinned(false);
          }
        }}
        onClick={() => {
          setPinned(!pinned);
          setOpen(!pinned);
        }}
      >
        <Lumi />
        <span className="lumi-question" aria-hidden="true">
          ?
        </span>
      </button>
      {open && (
        <div className="lumi-tooltip" role="tooltip" id={tipId}>
          <strong>A little spark from Lumi</strong>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}

const POSITIONS: Record<AssetId, { x: number; y: number; color: string }> = {
  solar: { x: 350, y: 145, color: "#83accb" },
  lighting: { x: 324, y: 255, color: "#f5d36b" },
  appliances: { x: 416, y: 358, color: "#a5c9dd" },
  heatPump: { x: 552, y: 248, color: "#eaa28e" },
  waterHeater: { x: 178, y: 244, color: "#a3d5d8" },
  battery: { x: 155, y: 371, color: "#a4bcd4" },
  ev: { x: 644, y: 394, color: "#89b7d2" },
};

function Equipment({
  id,
  complete,
  multi,
}: {
  id: AssetId;
  complete: boolean;
  multi: boolean;
}) {
  const position = POSITIONS[id];
  const fill = complete ? "#80cba2" : position.color;
  return (
    <g
      className="home-equipment"
      data-equipment={id}
      data-complete={complete}
      transform={`translate(${position.x} ${id === "solar" && multi ? 119 : position.y})`}
      stroke="#55746d"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      {id === "solar" && (
        <>
          <path d="m-60 13 25-43 87 13-25 43Z" fill={fill} />
          <path
            d="m-47-8 85 13M-7-26l-25 43m54-39L-3 21"
            stroke="#e9f6fc"
            strokeWidth="1.5"
          />
          <path d="m-50 17-3 10m76 3-2 9" />
        </>
      )}
      {id === "battery" && (
        <>
          <rect x="-26" y="-42" width="52" height="80" rx="7" fill={fill} />
          <path d="M-12-43v-6h24v6" fill={fill} />
          <rect
            x="-16"
            y="-29"
            width="32"
            height="7"
            rx="2"
            fill="#ecf7f2"
            stroke="none"
          />
          <path d="m4-13-17 26H0l-4 18 17-29H2Z" fill="#f8e09b" stroke="none" />
        </>
      )}
      {id === "heatPump" && (
        <>
          <rect x="-37" y="-31" width="74" height="62" rx="5" fill={fill} />
          <circle r="23" fill="#f4f8f4" />
          <g fill="#88aca1" stroke="none">
            <path d="M-3-3C-26-18-7-24 0-6ZM3-3C18-26 24-7 6 0ZM3 3C26 18 7 24 0 6ZM-3 3C-18 26-24 7-6 0Z" />
          </g>
          <circle r="5" fill="#55746d" stroke="none" />
          <path d="M-26 33v7m52-7v7" strokeWidth="4" />
        </>
      )}
      {id === "waterHeater" && (
        <>
          <path d="M-21-33c0-16 42-16 42 0v61c0 16-42 16-42 0Z" fill={fill} />
          <ellipse cy="-33" rx="21" ry="8" fill="#e8f6f1" />
          <circle cy="-5" r="9" fill="#f8fcfa" />
          <path d="M0-5 4-9m-12 51v7m17-7v7" strokeLinecap="round" />
        </>
      )}
      {id === "appliances" && (
        <>
          <rect x="-30" y="-37" width="60" height="70" rx="4" fill={fill} />
          <path d="M-29-20h58" />
          <circle cy="7" r="20" fill="#f5fbf9" />
          <path d="M-16 10q8-9 16-1t16 0" fill="none" stroke="#88b8c6" />
          <circle cx="18" cy="-28" r="3" fill="#f5fbf9" stroke="none" />
          <path d="M-21-28h13" strokeLinecap="round" />
        </>
      )}
      {id === "lighting" && (
        <>
          <path d="M0-44v16" />
          <path
            d="M-19-7a20 20 0 1 1 38 0c-2 7-9 11-10 18H-9C-10 4-17 0-19-7Z"
            fill={fill}
          />
          <path d="M-9 14H9m-7-25L-4 7M-7 20H7m-1 5H6" strokeLinecap="round" />
          <path d="M-34-15h-8m76 0h8m-67 28-6 6m56-6 6 6" stroke="#dfc665" />
        </>
      )}
      {id === "ev" && (
        <>
          <path d="m-54 5 9-28 25-5L4-24 26-5 51 1v26H-55Z" fill={fill} />
          <path d="m-36-19 16-4 21 3L17-5h-59Z" fill="#e3f4f5" />
          <path d="M-14-22v17m-35 17h10m81 0h8" />
          <circle cx="-33" cy="27" r="11" fill="#47655f" />
          <circle cx="31" cy="27" r="11" fill="#47655f" />
          <circle cx="-33" cy="27" r="4" fill="#e8efeb" stroke="none" />
          <circle cx="31" cy="27" r="4" fill="#e8efeb" stroke="none" />
          <path
            d="M-66 30V-6h-15v38m15-27q12-12 14 1"
            fill="none"
            strokeWidth="3"
          />
        </>
      )}
    </g>
  );
}

export function MomentumHome({
  household,
  completed,
}: {
  household: Household;
  completed: AssetId[];
}) {
  const [active, setActive] = useState<AssetId | null>(null);
  const [pinned, setPinned] = useState(false);
  const titleId = useId();
  const tipId = useId();
  const multi = household.building === "multi";
  const installed = ASSETS.filter(
    (asset) => household.assets[asset.id].status === "confirmed",
  );
  const activeAsset = ASSETS.find((asset) => asset.id === active);
  const tip = ENERGY_ACTIONS.find((action) => action.id === active);
  const done = installed.filter((asset) => completed.includes(asset.id)).length;
  return (
    <div className="momentum-home-section">
      <div
        className="momentum-home"
        data-testid="momentum-home"
        data-building={household.building}
        onMouseLeave={() => {
          if (!pinned) setActive(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && active) {
            event.preventDefault();
            event.stopPropagation();
            setActive(null);
            setPinned(false);
          }
        }}
      >
        <svg
          className="momentum-house-art"
          viewBox="0 0 760 480"
          role="img"
          aria-labelledby={titleId}
        >
          <title id={titleId}>
            {multi ? "Multi-family building" : "Single-family home"} with{" "}
            {installed.map((asset) => asset.name).join(", ") ||
              "no confirmed flexible equipment"}
          </title>
          <rect width="760" height="480" fill="#f1f8f8" />
          <path
            d="M0 397Q129 363 242 394T487 385T760 390V480H0Z"
            fill="#e0eee5"
          />
          <path
            d="M83 113c-2-14 20-24 31-13 9-19 37-14 41 4 17-1 23 9 20 15H76c-4-5 0-8 7-6Z"
            fill="#fff"
          />
          <g stroke="#eac359" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="645" cy="83" r="22" fill="#f7d66c" stroke="none" />
            <path d="M645 48v-7m0 91v-7m35-42h7m-84 0h7m10-25-5-5m55 55 5 5m-5-55 5-5m-55 55-5 5" />
          </g>
          <path d="M228 416h298l22 12H210Z" fill="#b7cfbf" />
          <path
            d={
              multi
                ? "M500 113 527 131v275l-27 10Z"
                : "M500 191 527 207v199l-27 10Z"
            }
            fill="#b6d0c5"
          />
          <rect
            x="251"
            y={multi ? 112 : 188}
            width="249"
            height={multi ? 295 : 219}
            fill="#fcfdf9"
            stroke="#b6c9c0"
            strokeWidth="2"
          />
          {multi ? (
            <>
              <path d="M239 96h271v18H239Z" fill="#d88977" />
              <path
                d="M270 150h48v37h-48Zm72 0h48v37h-48Zm72 0h48v37h-48Z"
                fill="#c8e2e8"
                stroke="#9fc1c7"
                strokeWidth="2"
              />
              <path d="M252 207h248" stroke="#d5e1d8" strokeWidth="8" />
            </>
          ) : (
            <>
              <path
                d="m229 190 145-118 149 118-16 15L374 99 243 205Z"
                fill="#d88977"
                stroke="#b66f60"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="m269 188 105-84 105 84Z" fill="#f5f3ea" />
            </>
          )}
          <path d="M270 218h91v91h-91Zm118 0h92v91h-92Z" fill="#eaf3ed" />
          <path d="M270 333h91v58h-91Zm118 0h92v58h-92Z" fill="#edf4ef" />
          <path d="M251 319h249M374 207v200" stroke="#d2e0d5" strokeWidth="7" />
          <path d="M280 391v-45h32v45" fill="#c1d8cb" />
          <path d="M400 265h59v44h-59Z" fill="#e1eae3" />
          <path d="M406 265v-17h47v17" fill="#c5d8d1" />
          <g fill="none" strokeLinecap="round">
            <path d="M49 437h630" stroke="#b4c9be" strokeWidth="3" />
            <path
              className="momentum-energy-flow"
              d="M49 437h630"
              stroke="#eebf2e"
              strokeWidth="5"
              strokeDasharray="0.1 23"
            />
            {installed.map((asset) => {
              const position = POSITIONS[asset.id];
              const path = `M${position.x} 437V${asset.id === "solar" && multi ? 119 : position.y}`;
              return (
                <g key={asset.id}>
                  <path d={path} stroke="#b4c9be" strokeWidth="2" />
                  <path
                    d={path}
                    className={`momentum-energy-flow flow-${asset.id}`}
                    stroke="#eebf2e"
                    strokeWidth="5"
                    strokeDasharray="0.1 23"
                  />
                </g>
              );
            })}
          </g>
          <g transform="translate(45 407)">
            <rect
              x="-14"
              y="-22"
              width="28"
              height="45"
              rx="4"
              fill="#91b9aa"
            />
            <path d="m4-15-13 19H0l-2 14L10-4H2Z" fill="#ffe194" />
          </g>
          {installed.map((asset) => (
            <Equipment
              key={asset.id}
              id={asset.id}
              complete={completed.includes(asset.id)}
              multi={multi}
            />
          ))}
          <path
            d="M89 372v26m-8-12 8 5 8-13m605-51v31m-8-17 8 7 8-14"
            fill="none"
            stroke="#85b39b"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        {installed.map((asset) => {
          const position = POSITIONS[asset.id];
          const complete = completed.includes(asset.id);
          return (
            <button
              key={asset.id}
              className={`home-device-hit ${complete ? "is-complete" : ""}`}
              data-testid={`home-${asset.id}`}
              aria-label={`${asset.name}${complete ? ", action completed" : ""}`}
              aria-describedby={active === asset.id ? tipId : undefined}
              aria-expanded={active === asset.id}
              style={{
                left: `${(position.x / 760) * 100}%`,
                top: `${((asset.id === "solar" && multi ? 119 : position.y) / 480) * 100}%`,
              }}
              onMouseEnter={() => {
                setActive(asset.id);
                setPinned(false);
              }}
              onFocus={() => setActive(asset.id)}
              onBlur={(event) => {
                if (
                  !event.currentTarget.parentElement?.contains(
                    event.relatedTarget,
                  )
                ) {
                  setActive(null);
                  setPinned(false);
                }
              }}
              onClick={() => {
                const next = active === asset.id && pinned ? null : asset.id;
                setActive(next);
                setPinned(next !== null);
              }}
            >
              {complete && (
                <span className="home-complete-check">
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
        {activeAsset && tip && (
          <div id={tipId} className="home-tip" role="tooltip">
            <div>
              <strong>{activeAsset.name}</strong>
              <button
                aria-label="Close equipment tip"
                title="Close equipment tip"
                onClick={() => {
                  setActive(null);
                  setPinned(false);
                }}
              >
                <X size={15} />
              </button>
            </div>
            <p>
              {tip.effect}.{" "}
              {completed.includes(activeAsset.id)
                ? "Already part of your progress."
                : tip.title + "."}
            </p>
          </div>
        )}
      </div>
      <div className="momentum-home-caption">
        <span>
          {multi ? <Building2 size={17} /> : <House size={17} />}
          {multi ? "Multi-family building" : "Single-family home"}
        </span>
        <span>
          <i />
          {done} of {installed.length} in motion
        </span>
      </div>
    </div>
  );
}
