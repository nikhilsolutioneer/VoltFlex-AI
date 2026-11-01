import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Coins,
  Download,
  FlaskConical,
  LockKeyhole,
  Medal,
  Pause,
  Play,
  TrendingUp,
  X,
} from "lucide-react";
import { Dialog, IconButton } from "./components";
import { Lumi, MomentumGuide, MomentumHome } from "./MomentumScene";
import { MomentumChart } from "./MomentumChart";
import {
  actionBlockReason,
  actionPreview,
  ENERGY_ACTIONS,
  momentumRanking,
  summarizeProgress,
} from "./energyStory";
import type { StoryEntry } from "./energyStory";
import { ASSET_ICONS } from "./icons";
import { number } from "./model";
import type { AssetId, Household } from "./model";
import { downloadText } from "./storage";
import "./energy-momentum.css";

const CHAPTERS = [
  {
    name: "Home",
    title: "Your home, in motion.",
    next: "See my timing",
    tip: "Every coloured part is equipment you have confirmed. Yellow sparks follow the electricity. Green means you have already tried a matching action in this demo. Your real devices stay unchanged.",
  },
  {
    name: "Timing",
    title: "Same day. Better timing.",
    next: "Choose an action",
    tip: "The grey line is before; the green line is after. The coloured spaces show what moved. Prices below explain why timing matters. These are illustrative schedules: your comfort and safety always come first.",
  },
  {
    name: "Actions",
    title: "Your next small move.",
    next: "See the ranking",
    tip: "A small change can become a useful habit. Each action shows its example saving in francs and the same number of coins. Trying it records a demo occurrence, not a real device change.",
  },
  {
    name: "Ranking",
    title: "Small moves add up.",
    next: "Unwrap my progress",
    tip: "Different homes have different opportunities. These fictional participants show how small savings can add up over time. Your own progress matters more than your place.",
  },
  {
    name: "Wrap-up",
    title: "Your progress, unwrapped.",
    next: "Back to my home",
    tip: "Here is every move in your story, including a few example actions to get started. Each repeat counts once. The locked rows are possibilities you have not tried yet. Keep the changes that fit your life.",
  },
];

export function EnergyMomentumLaunch({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="momentum-launch" aria-label="Energy Momentum story">
      <span className="momentum-launch-mark">
        <TrendingUp size={28} />
      </span>
      <div>
        <span className="momentum-kicker">A LITTLE PROGRESS, EVERY DAY</span>
        <h2>Energy Momentum</h2>
        <p>Your home. Your pace. Your next small move.</p>
      </div>
      <button className="button momentum-primary" onClick={onOpen}>
        <Play size={14} fill="currentColor" />
        Start my story
      </button>
    </section>
  );
}

function ActionList({
  household,
  entries,
  onRecordAction,
  onEditHome,
}: {
  household: Household;
  entries: StoryEntry[];
  onRecordAction: (id: AssetId) => void;
  onEditHome: () => void;
}) {
  const [selected, setSelected] = useState<AssetId | null>(null);
  const [celebration, setCelebration] = useState(0);
  const noteRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected)
      noteRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
  }, [selected, celebration]);
  const summary = summarizeProgress(entries);
  const available = ENERGY_ACTIONS.filter(
    (action) => household.assets[action.id].status === "confirmed",
  );
  return (
    <section aria-label="Your flexibility actions">
      <div className="momentum-section-line">
        <p>A little less on the bill. A little more in your pocket.</p>
        <span>
          <Coins size={16} />1 coin = CHF 1
        </span>
      </div>
      {available.length ? (
        <ul className="momentum-action-list">
          {available.map((action) => {
            const Icon = ASSET_ICONS[action.id];
            const reason = actionBlockReason(household, action);
            const { savedCents } = actionPreview(household, action);
            const count = summary.actions.find(
              (item) => item.id === action.id,
            )!.count;
            return (
              <li
                key={action.id}
                data-testid={`action-${action.id}`}
                className={selected === action.id ? "selected" : ""}
              >
                <button
                  className="momentum-action-button"
                  disabled={reason !== null || savedCents <= 0}
                  aria-label={`${action.title}, save CHF ${number(savedCents / 100, 2)}, earn ${number(savedCents / 100, 2)} coins`}
                  onClick={() => {
                    onRecordAction(action.id);
                    setSelected(action.id);
                    setCelebration((previous) => previous + 1);
                  }}
                >
                  <span
                    className={`momentum-asset-icon asset-${action.id} ${count ? "completed" : ""}`}
                  >
                    <Icon size={23} strokeWidth={1.7} />
                    {count > 0 && (
                      <Check className="asset-done" size={12} strokeWidth={3} />
                    )}
                  </span>
                  <span className="momentum-action-copy">
                    <strong>{action.title}</strong>
                    <small>
                      {reason ??
                        (count
                          ? `${count} demo ${count === 1 ? "action" : "actions"} completed`
                          : "A new possibility")}
                    </small>
                  </span>
                  <span className="momentum-action-effect">
                    <ArrowRight size={15} />
                    {action.effect}
                  </span>
                  <span className="momentum-action-reward">
                    <span>
                      <Coins size={18} />
                      <b>+{number(savedCents / 100, 2)}</b>
                    </span>
                    <small>CHF {number(savedCents / 100, 2)} saved</small>
                  </span>
                </button>
                {selected === action.id && (
                  <div
                    className="momentum-action-note"
                    ref={noteRef}
                    key={celebration}
                  >
                    <Lumi celebrating />
                    <div className="momentum-speech">
                      <IconButton
                        icon={X}
                        label="Close action explanation"
                        onClick={() => setSelected(null)}
                      />
                      <strong role="status">
                        <CheckCheck size={17} />+{number(savedCents / 100, 2)}{" "}
                        coins. A little more momentum.
                      </strong>
                      <p>{action.explanation}</p>
                      <span>
                        {action.effect}. This demo occurrence has been added to
                        your history.
                      </span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="momentum-empty">
          <h4>Your next move starts with your home.</h4>
          <p>There is no confirmed flexible equipment in this profile yet.</p>
          <button className="button secondary" onClick={onEditHome}>
            Update my household
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      <p className="momentum-fine-print">
        Example savings per occurrence, not a forecast or cash reward. Each
        click records another demo action; no device or tariff is changed.
      </p>
    </section>
  );
}

function Ranking({ totalCents }: { totalCents: number }) {
  const ranking = momentumRanking(totalCents);
  return (
    <section className="momentum-ranking" aria-label="Participant ranking">
      <div className="momentum-section-line">
        <p>Small changes become something bigger, together.</p>
        <span>
          <FlaskConical size={15} />
          Demo participants
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">Place</th>
            <th scope="col">Participant</th>
            <th scope="col">Coins</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((peer, index) => (
            <tr
              key={peer.name}
              className={`${index < 3 ? ["rank-gold", "rank-silver", "rank-bronze"][index] : ""} ${peer.you ? "rank-you" : ""}`}
              data-testid={peer.you ? "your-rank" : undefined}
            >
              <td>
                <span className="momentum-rank-number">
                  {index < 3 && <Medal size={23} strokeWidth={1.8} />}
                  <b>{String(index + 1).padStart(2, "0")}</b>
                </span>
              </td>
              <td>
                {peer.name}
                {peer.you && (
                  <span className="momentum-you-label">Your progress</span>
                )}
              </td>
              <td>{number(peer.coins, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="momentum-ranking-message">
        <TrendingUp size={22} />
        <span>
          SolarSophie is already at <strong>CHF 128.40 saved</strong> in this
          demo. Your next small move counts, too.
        </span>
      </p>
      <p className="momentum-fine-print">
        Fictional names and balances. No customer data is shared or connected.
      </p>
    </section>
  );
}

function useCoinCount(
  totalCents: number,
  paused: boolean,
  reducedMotion: boolean,
) {
  const [value, setValue] = useState(reducedMotion ? totalCents : 0);
  const current = useRef(value);
  useEffect(() => {
    if (paused && !reducedMotion) return;
    const initial = current.current;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = reducedMotion ? 1 : Math.min(1, (now - start) / 1800);
      current.current = Math.round(
        initial + (totalCents - initial) * (1 - (1 - progress) ** 3),
      );
      setValue(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [totalCents, paused, reducedMotion]);
  return reducedMotion ? totalCents : value;
}

function Celebration() {
  return (
    <div
      className="momentum-celebration"
      aria-hidden="true"
      data-testid="momentum-celebration"
    >
      {[0, 1, 2].map((burst) => (
        <div className={`momentum-firework firework-${burst}`} key={burst}>
          {Array.from({ length: 12 }, (_, particle) => (
            <i
              key={particle}
              style={
                {
                  "--angle": `${particle * 30}deg`,
                  "--delay": `${burst * 0.3}s`,
                  background: ["#e4b843", "#4da482", "#70a9cf"][particle % 3],
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
      {Array.from({ length: 12 }, (_, coin) => (
        <Coins
          key={coin}
          className="momentum-flying-coin"
          size={25}
          style={
            {
              "--from-x": `${(coin % 2 ? 1 : -1) * (100 + (coin % 3) * 35)}px`,
              "--from-y": `${coin % 3 === 0 ? -70 : 70 + (coin % 4) * 8}px`,
              "--delay": `${coin * 0.075}s`,
              "--turn": `${coin % 2 ? -120 : 120}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function WrapUp({
  entries,
  household,
  paused,
  reducedMotion,
}: {
  entries: StoryEntry[];
  household: Household;
  paused: boolean;
  reducedMotion: boolean;
}) {
  const summary = summarizeProgress(entries);
  const counter = useCoinCount(summary.totalCents, paused, reducedMotion);
  const [downloaded, setDownloaded] = useState(false);
  summary.actions.sort(
    (left, right) => Number(right.count > 0) - Number(left.count > 0),
  );
  const completed = summary.actions.filter((action) => action.count > 0);
  const examples = entries.filter((entry) => entry.source === "example").length;
  function downloadRecap() {
    downloadText(
      "my-energy-momentum-recap.md",
      [
        "# My Energy Momentum recap",
        "",
        `Demo balance: ${number(summary.totalCents / 100, 2)} coins = CHF ${number(summary.totalCents / 100, 2)} in illustrative savings.`,
        `${entries.length} demo actions, including ${examples} preloaded examples.`,
        "",
        ...completed.map(
          (action) =>
            `- ${action.title}: ${action.count} time(s), ${number(action.savedCents / 100, 2)} coins.`,
        ),
        "",
        "One coin represents one illustrative Swiss franc saved. These are demo actions, not verified savings, real device changes or cash rewards.",
        "No household readings or peer ranking are included. Nothing has been shared with EKZ or other participants.",
      ].join("\n"),
      "text/markdown",
    );
    setDownloaded(true);
  }
  return (
    <section className="momentum-wrap-up" aria-label="Your progress wrap-up">
      <div className="momentum-total-stage">
        <span className="momentum-kicker">EVERY LITTLE MOVE COUNTS</span>
        <div className="momentum-total">
          <Coins size={34} />
          <strong data-testid="recap-coins" aria-hidden="true">
            {number(counter / 100, 2)}
          </strong>
          <Celebration />
        </div>
        <span className="momentum-total-label">coins collected</span>
        <span className="sr-only" role="status">
          {number(summary.totalCents / 100, 2)} coins total
        </span>
        <p>CHF {number(summary.totalCents / 100, 2)} in illustrative savings</p>
        <div className="momentum-wrap-stats">
          <span>
            <CheckCheck size={17} />
            {entries.length} demo actions
          </span>
          <span>{completed.length} flexibilities in motion</span>
        </div>
      </div>
      <div className="momentum-history-heading">
        <h4>Your action history</h4>
        <IconButton
          icon={Download}
          label="Download my recap"
          onClick={downloadRecap}
        />
      </div>
      <ul className="momentum-history">
        {summary.actions.map((action) => {
          const Icon = ASSET_ICONS[action.id];
          const locked = action.count === 0;
          return (
            <li
              key={action.id}
              className={locked ? "is-locked" : "is-done"}
              data-testid={`history-${action.id}`}
            >
              <span className="momentum-history-icon">
                {locked ? <LockKeyhole size={19} /> : <Icon size={21} />}
              </span>
              <span className="momentum-history-copy">
                <strong>{action.title}</strong>
                <small>
                  {locked
                    ? actionBlockReason(household, action)
                      ? "Not available in this home yet"
                      : "Not tried yet"
                    : `${action.count} ${action.count === 1 ? "time" : "times"} completed`}
                </small>
              </span>
              <span className="momentum-history-coins">
                {locked ? (
                  <LockKeyhole size={15} />
                ) : (
                  <>
                    <b>{number(action.savedCents / 100, 2)}</b>
                    <small>coins / CHF</small>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="momentum-fine-print">
        {examples} preloaded example actions are included. Progress is kept
        during this app visit; no real savings have been verified.
      </p>
      {downloaded && (
        <p className="momentum-download-status" role="status">
          <Check size={15} />
          Recap downloaded. Nothing shared.
        </p>
      )}
    </section>
  );
}

export function EnergyMomentum({
  household,
  entries,
  onRecordAction,
  onEditHome,
  onClose,
}: {
  household: Household;
  entries: StoryEntry[];
  onRecordAction: (id: AssetId) => void;
  onEditHome: () => void;
  onClose: () => void;
}) {
  const [chapter, setChapter] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summary = summarizeProgress(entries);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
    headingRef.current?.focus({ preventScroll: true });
  }, [chapter]);
  return (
    <Dialog
      title="Energy Momentum"
      className={`energy-momentum-dialog ${paused || reducedMotion ? "momentum-paused" : ""}`}
      onClose={onClose}
    >
      <div className="momentum-toolbar">
        <span className="momentum-demo">
          <span />
          Demo / this visit
        </span>
        <div className="momentum-toolbar-balance">
          <span>
            <Coins size={18} />
            <strong data-testid="story-coins">
              {number(summary.totalCents / 100, 2)}
            </strong>
            coins
          </span>
          <IconButton
            icon={paused || reducedMotion ? Play : Pause}
            label={
              reducedMotion
                ? "Reduced motion is enabled"
                : paused
                  ? "Play story animations"
                  : "Pause story animations"
            }
            disabled={reducedMotion}
            onClick={() => setPaused(!paused)}
          />
        </div>
      </div>
      <nav className="momentum-progress" aria-label="Story chapters">
        <ol>
          {CHAPTERS.map((item, index) => (
            <li key={item.name}>
              <button
                onClick={() => setChapter(index)}
                aria-label={`Go to ${item.name}`}
                aria-current={index === chapter ? "step" : undefined}
                className={index < chapter ? "visited" : ""}
              >
                <span className="momentum-step-number">
                  {index < chapter ? (
                    <Check size={12} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <span>{item.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div
        className={`momentum-content momentum-chapter-${chapter}`}
        ref={contentRef}
      >
        <div className="momentum-chapter-intro">
          <div>
            <span className="momentum-kicker">
              {String(chapter + 1).padStart(2, "0")} / YOUR{" "}
              {CHAPTERS[chapter].name.toUpperCase()}
            </span>
            <h3 ref={headingRef} tabIndex={-1}>
              {CHAPTERS[chapter].title}
            </h3>
          </div>
          <MomentumGuide
            key={chapter}
            topic={CHAPTERS[chapter].name.toLowerCase()}
            message={CHAPTERS[chapter].tip}
          />
        </div>
        <div className="momentum-chapter" key={chapter}>
          {chapter === 0 && (
            <>
              <MomentumHome
                household={household}
                completed={summary.actions
                  .filter((action) => action.count > 0)
                  .map((action) => action.id)}
              />
              <div className="momentum-home-bottom">
                <span>Based on your confirmed household equipment.</span>
                <button className="text-button" onClick={onEditHome}>
                  My household
                  <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}
          {chapter === 1 && (
            <MomentumChart household={household} onEditHome={onEditHome} />
          )}
          {chapter === 2 && (
            <ActionList
              household={household}
              entries={entries}
              onRecordAction={onRecordAction}
              onEditHome={onEditHome}
            />
          )}
          {chapter === 3 && <Ranking totalCents={summary.totalCents} />}
          {chapter === 4 && (
            <WrapUp
              household={household}
              entries={entries}
              paused={paused}
              reducedMotion={reducedMotion}
            />
          )}
        </div>
      </div>
      <footer className="momentum-footer">
        <div>
          <button
            className="momentum-back"
            onClick={() => (chapter ? setChapter(chapter - 1) : onClose())}
          >
            <ArrowLeft size={17} />
            {chapter ? "Back" : "Exit"}
          </button>
          <span>
            {chapter + 1} of {CHAPTERS.length}
          </span>
        </div>
        <button
          className="button momentum-primary"
          onClick={() => setChapter((chapter + 1) % CHAPTERS.length)}
        >
          {CHAPTERS[chapter].next}
          <ArrowRight size={17} />
        </button>
      </footer>
    </Dialog>
  );
}
