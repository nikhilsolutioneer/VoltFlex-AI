import { useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  House,
  ListChecks,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { defaultHousehold, simulate } from "./model";
import type { AssetStatus, Household, Scenario, ScenarioKind } from "./model";
import { Badge, Dialog, IconButton } from "./components";
import { HouseholdEditor } from "./HouseholdEditor";
import { Comparison, Electricity, NextStep, Opportunities } from "./views";
import { EnergyGuide } from "./EnergyGuide";
import { EnergyMomentum, EnergyMomentumLaunch } from "./EnergyMomentum";
import { createDemoProgress, recordStoryAction } from "./energyStory";
import type { StoryEntry } from "./energyStory";
import { scenarioFor } from "./opportunities";
import { loadPlan, persistPlan, STORAGE_KEY } from "./storage";
import type { SavedPlan } from "./storage";

const NAVIGATION = [
  {
    path: "/",
    name: "My electricity",
    short: "Electricity",
    icon: ChartNoAxesCombined,
  },
  {
    path: "/opportunities",
    name: "My opportunities",
    short: "Opportunities",
    icon: Sparkles,
  },
  {
    path: "/compare",
    name: "Compare an option",
    short: "Compare",
    icon: SlidersHorizontal,
  },
  {
    path: "/next-step",
    name: "My next step",
    short: "Next step",
    icon: ListChecks,
  },
];

const SUBTITLES: Record<string, string> = {
  "/": "A representative weekday at your meter.",
  "/opportunities": "Practical possibilities, shaped around your household.",
  "/compare": "Your baseline, your constraints, your choice.",
  "/next-step": "One considered action, with a reason behind it.",
};

function App() {
  const [plan, setPlan] = useState<SavedPlan | null>(loadPlan);
  const [household, setHousehold] = useState<Household>(
    () => plan?.household ?? defaultHousehold(),
  );
  const [scenario, setScenario] = useState<Scenario>(
    () => plan?.scenario ?? scenarioFor("charging"),
  );
  const [mode, setMode] = useState<"usage" | "impact">("usage");
  const [dialog, setDialog] = useState<"household" | "assumptions" | null>(
    null,
  );
  const [guide, setGuide] = useState<{ question?: string; key: number } | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyEntries, setStoryEntries] = useState<StoryEntry[] | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const active =
    NAVIGATION.find((item) => item.path === location.pathname) ?? NAVIGATION[0];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.getElementById("page-title")?.focus({ preventScroll: true });
  }, [location.pathname]);

  function openStory() {
    setGuide(null);
    setStoryEntries((previous) => previous ?? createDemoProgress(household));
    setStoryOpen(true);
  }
  function editHome() {
    setStoryOpen(false);
    setGuide(null);
    setDialog("household");
  }
  function openScenario(kind: ScenarioKind) {
    setStoryOpen(false);
    setScenario(scenarioFor(kind));
    setGuide(null);
    navigate("/compare");
  }
  function ask(question?: string) {
    setStoryOpen(false);
    setGuide({ question, key: Date.now() });
  }
  function confirmEv(status: AssetStatus) {
    setHousehold((previous) => ({
      ...previous,
      assets: { ...previous.assets, ev: { ...previous.assets.ev, status } },
    }));
    setNotice(
      status === "confirmed"
        ? "Charging pattern confirmed. The estimates remain illustrative."
        : "EV attribution removed. Your original meter readings are unchanged.",
    );
  }
  function saveScenario(chosenScenario: Scenario) {
    if (!simulate(household, chosenScenario).feasible) return;
    setScenario(chosenScenario);
    setStoryOpen(false);
    const draft: SavedPlan = {
      version: 1,
      household: structuredClone(household),
      scenario: { ...chosenScenario },
      checked: [],
      notes: "",
      createdAt: new Date().toISOString(),
    };
    setPlan(draft);
    setNotice(
      persistPlan(draft)
        ? "Draft saved on this device. No contract or device changes have been made."
        : "Draft saved for this session. Browser storage is unavailable.",
    );
    navigate("/next-step");
  }
  function updatePlan(update: Partial<Pick<SavedPlan, "checked" | "notes">>) {
    if (!plan) return;
    const updated = { ...plan, ...update };
    setPlan(updated);
    setNotice(
      persistPlan(updated)
        ? "Your draft has been updated on this device."
        : "Your draft has been updated for this session only.",
    );
  }
  function removePlan() {
    setPlan(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      setNotice("The local draft has been deleted.");
    } catch {
      setNotice(
        "Draft removed from this session. Browser storage is unavailable.",
      );
    }
  }
  const viewActions = {
    household,
    onEditHome: editHome,
    onOpenScenario: openScenario,
    onAssumptions: () => setDialog("assumptions"),
    onAsk: ask,
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="brand" aria-label="EKZ energy home">
          <span className="brand-mark">
            ekz<span>.</span>
          </span>
          <span className="brand-subtitle">energy & you</span>
        </NavLink>
        <div className="navigation-label">YOUR ENERGY</div>
        <nav className="main-navigation" aria-label="Main navigation">
          {NAVIGATION.map((item) => (
            <NavLink
              to={item.path}
              end={item.path === "/"}
              key={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              title={item.name}
            >
              <item.icon size={20} strokeWidth={1.7} />
              <span className="nav-label">{item.name}</span>
              <span className="mobile-nav-label">{item.short}</span>
              {item.path === "/next-step" && plan && (
                <span className="nav-count" aria-label="One saved plan">
                  1
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="guide-launch"
            onClick={() => ask()}
            title="Ask my energy guide"
          >
            <Sparkles size={20} />
            <span>Ask my energy guide</span>
            <ChevronRight size={15} />
          </button>
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <span>
              Private demo
              <br />
              <small>No live connections</small>
            </span>
          </div>
          <button
            className="profile-button"
            onClick={editHome}
            title="Your example account"
          >
            <span className="avatar">
              <UserRound size={18} />
            </span>
            <span>
              Your household<small>Example account</small>
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="global-header">
          <div className="breadcrumb">
            <House size={15} />
            <ChevronRight size={12} />
            <span>Household energy</span>
          </div>
          <div className="header-actions">
            <button
              className="defender-header-button"
              aria-label="Open Energy Momentum"
              title="Open Energy Momentum"
              onClick={openStory}
            >
              <TrendingUp size={18} />
              <span>Energy Momentum</span>
            </button>
            <button
              className="demo-indicator"
              onClick={() => setDialog("assumptions")}
            >
              <FlaskConical size={14} />
              <span>Illustrative data</span>
            </button>
            <IconButton
              icon={CircleHelp}
              label="Data and assumptions"
              onClick={() => setDialog("assumptions")}
            />
            <span className="header-divider" />
            <button className="button secondary home-button" aria-label="My household" title="My household" onClick={editHome}>
              <SlidersHorizontal size={16} />
              <span>My household</span>
            </button>
          </div>
        </header>
        <main id="main-content" className="workspace">
          <div className="page-heading">
            <div>
              <span className="eyebrow">YOUR HOME. YOUR CHOICES.</span>
              <h1 id="page-title" tabIndex={-1}>
                {active.name}
              </h1>
              <p>{SUBTITLES[location.pathname]}</p>
            </div>
            <div className="period-label">
              <span className="period-dot" />
              10 September 2026
              <small>Representative day / Zurich local time</small>
            </div>
          </div>
          {location.pathname === "/" && (
            <EnergyMomentumLaunch onOpen={openStory} />
          )}
          {notice && (
            <div className="notice status-notice" role="status">
              <ShieldCheck size={17} />
              <span>{notice}</span>
              <IconButton
                icon={X}
                label="Dismiss notification"
                onClick={() => setNotice("")}
              />
            </div>
          )}
          <Routes>
            <Route
              path="/"
              element={
                <Electricity
                  {...viewActions}
                  onConfirmEv={confirmEv}
                  mode={mode}
                  onModeChange={setMode}
                />
              }
            />
            <Route
              path="/opportunities"
              element={<Opportunities {...viewActions} />}
            />
            <Route
              path="/compare"
              element={
                <Comparison
                  {...viewActions}
                  scenario={scenario}
                  onChangeScenario={(update) =>
                    setScenario((previous) => ({ ...previous, ...update }))
                  }
                  onSave={() => saveScenario(scenario)}
                />
              }
            />
            <Route
              path="/next-step"
              element={
                <NextStep
                  key={plan?.createdAt ?? "empty"}
                  plan={plan}
                  household={household}
                  onUpdate={updatePlan}
                  onRecompare={(nextScenario) => {
                    setScenario({ ...nextScenario });
                    navigate("/compare");
                  }}
                  onExplore={() => navigate("/opportunities")}
                  onRemove={removePlan}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="workspace-footer">
            <span>
              <Zap size={13} />
              EKZ / Customer flexibility concept
            </span>
            <span>Illustrative, not connected to Fabric</span>
          </footer>
        </main>
      </div>
      {storyOpen && (
        <EnergyMomentum
          household={household}
          entries={storyEntries ?? []}
          onRecordAction={(actionId) => setStoryEntries((previous) => recordStoryAction(previous ?? [], household, actionId))}
          onEditHome={editHome}
          onClose={() => setStoryOpen(false)}
        />
      )}
      {dialog === "household" && (
        <HouseholdEditor
          household={household}
          onApply={(updated) => {
            setHousehold(updated);
            setNotice(
              "Household updated. Your meter readings are unchanged; recommendations use the new assumptions.",
            );
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "assumptions" && (
        <Assumptions onClose={() => setDialog(null)} />
      )}
      {guide && (
        <EnergyGuide
          key={guide.key}
          household={household}
          initialQuestion={guide.question}
          onClose={() => setGuide(null)}
          onAction={(action) => {
            setGuide(null);
            if (action === "household") editHome();
            else if (action === "impact") {
              setMode("impact");
              navigate("/");
            } else openScenario(action);
          }}
        />
      )}
    </div>
  );
}

function Assumptions({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Data and assumptions" onClose={onClose}>
      <div className="dialog-body assumptions-body">
        <Badge tone="amber">All figures are illustrative</Badge>
        <h3>A discussion prototype, not a live account</h3>
        <p>
          The intended platform is Rayfin on Microsoft Fabric. This prototype
          has no Fabric connection, verified EKZ tariffs, real grid events, live
          carbon feed or device controls.
        </p>
        <dl className="source-list">
          <div>
            <dt>Meter readings</dt>
            <dd>
              96 synthetic 15-minute grid-import values for one representative
              weekday. Correcting an equipment inference does not rewrite these
              readings. Export and behind-the-meter telemetry are not provided.
            </dd>
          </div>
          <div>
            <dt>Household equipment</dt>
            <dd>
              Equipment status, capacity, meter scope and shared control are
              editable assumptions. Presence is not available flexibility.
              Thermal comfort, hygiene, safe appliance cycles and battery state
              can limit what is possible.
            </dd>
          </div>
          <div>
            <dt>Tariffs and investment</dt>
            <dd>
              Example rates only: Standard 29 rp/kWh; Day & night 34/22 rp; Flex
              17-42 rp. Standing charges are CHF 8.50 or CHF 10 per month.
              Export is assumed at CHF 0.08/kWh. Actual tariff eligibility and
              all additional charges must be verified.
            </dd>
          </div>
          <div>
            <dt>Annual projections</dt>
            <dd>
              The representative day repeats 365 times. No seasonal, occupancy
              or weather adjustment. Solar is a synthetic daylight profile;
              battery round-trip efficiency is 90%, with a 3 kW limit and an
              empty-to-empty daily cycle.
            </dd>
          </div>
          <div>
            <dt>Climate and wider impact</dt>
            <dd>
              Illustrative factors are 70 g CO2e/kWh in the midday window, 210 g
              in the evening window and 120 g otherwise. These estimate the
              operational footprint of imported electricity, not full household
              or life-cycle emissions. Differences are not verified avoided
              emissions.
            </dd>
          </div>
          <div>
            <dt>Grid and collective scenarios</dt>
            <dd>
              17:00-21:00 is an example pressure window, not a real EKZ event.
              Collective results multiply one comparable action by the selected
              household count. They are not forecasts of network effects,
              prevented outages or avoided investment.
            </dd>
          </div>
          <div>
            <dt>Drafts and guide</dt>
            <dd>
              Saving a plan writes only to this browser's local storage.
              Downloads stay on your device. The energy guide uses scripted
              responses grounded in the same scenario model; it is not a live AI
              service.
            </dd>
          </div>
        </dl>
        <p className="fine-print">
          Illustrative solar photograph via{" "}
          <a
            href="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d"
            target="_blank"
            rel="noreferrer"
          >
            Unsplash
          </a>
          . It does not depict the customer's property.
        </p>
      </div>
      <div className="dialog-footer">
        <button className="button primary" onClick={onClose}>
          Back to my electricity
        </button>
      </div>
    </Dialog>
  );
}

export default App;
