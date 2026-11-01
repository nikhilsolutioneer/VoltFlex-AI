import { useEffect, useRef, useState } from "react";
import { ArrowRight, Database, Send, Settings, Sparkles } from "lucide-react";
import { Dialog, Badge } from "./components";
import { askDataAgent } from "./agent/dataAgent";
import { askOpenAI } from "./agent/openai";
import {
  buildSystemPrompt,
  MAX_QUESTION_LENGTH,
  sanitizeQuestion,
} from "./agent/prompt";
import { useAgentConfig, type AgentConfig } from "./agent/useAgentConfig";
import type { Household, ScenarioKind } from "./model";

type Action = ScenarioKind | "household" | "impact";
interface Message {
  role: "customer" | "guide";
  text: string;
  measured?: string;
  pending?: boolean;
  error?: string;
  action?: Action;
  label?: string;
}

const FOLLOW_UPS: { match: RegExp; action: Action; label: string }[] = [
  { match: /no (electric|ev)|don.t have|do not have/i, action: "household", label: "Review household equipment" },
  { match: /battery|storage/i, action: "battery", label: "Compare home storage" },
  { match: /solar|\bpv\b|roof/i, action: "solar", label: "Explore a solar scenario" },
  { match: /impact|carbon|climate|global/i, action: "impact", label: "See my wider impact" },
  { match: /tariff|price|bill|cost|save/i, action: "tariff", label: "Compare the example tariffs" },
  { match: /charg|\bev\b|car|evening|peak/i, action: "charging", label: "Adjust the charging scenario" },
  { match: /curtail|export|feed.?in/i, action: "curtail", label: "Review curtailment" },
];

/** The agent answers; the app only decides which screen that answer should lead to. */
function followUp(question: string, answer: string) {
  const text = `${question}\n${answer}`;
  return (
    FOLLOW_UPS.find((entry) => entry.match.test(text)) ?? {
      action: "household" as Action,
      label: "Review household assumptions",
    }
  );
}

function AgentSettings({ config }: { config: AgentConfig }) {
  const [open, setOpen] = useState(!config.configured || !config.dataAgentReady);
  return (
    <div className="guide-settings">
      <button
        className="text-button"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Settings size={15} />
        {open ? "Hide connection" : "Connection settings"}
      </button>
      {open && (
        <div className="guide-settings-fields">
          <label>
            Azure OpenAI endpoint
            <input
              value={config.endpoint}
              onChange={(event) => config.setEndpoint(event.target.value)}
              placeholder="https://your-resource.openai.azure.com"
              autoComplete="off"
            />
          </label>
          <label>
            Deployment
            <input
              value={config.deployment}
              onChange={(event) => config.setDeployment(event.target.value)}
              placeholder="gpt-4o-mini"
              autoComplete="off"
            />
          </label>
          <label>
            API key
            <input
              type="password"
              value={config.apiKey}
              onChange={(event) => config.setApiKey(event.target.value)}
              placeholder="Kept in page memory only"
              autoComplete="off"
            />
          </label>
          <label>
            Fabric data agent token
            <input
              type="password"
              value={config.dataAgentToken}
              onChange={(event) => config.setDataAgentToken(event.target.value)}
              placeholder="Token for the MCP data agent"
              autoComplete="off"
            />
          </label>
          <button className="text-button" type="button" onClick={config.clear}>
            Clear credentials
          </button>
        </div>
      )}
    </div>
  );
}

export function EnergyGuide({
  household,
  initialQuestion,
  onClose,
  onAction,
}: {
  household: Household;
  initialQuestion?: string;
  onClose: () => void;
  onAction: (action: Action) => void;
}) {
  const config = useAgentConfig();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  const abort = useRef<AbortController | null>(null);

  async function ask(text: string) {
    let cleaned: string;
    try {
      cleaned = sanitizeQuestion(text);
    } catch {
      return;
    }
    if (busy) return;
    setQuestion("");
    if (!config.configured) {
      setMessages((previous) => [
        ...previous,
        { role: "customer", text: cleaned },
        {
          role: "guide",
          text: "",
          error:
            "Add the Azure OpenAI endpoint, deployment and key in connection settings so the live agent can answer.",
        },
      ]);
      return;
    }

    let slot = 0;
    setMessages((previous) => {
      slot = previous.length + 1;
      return [
        ...previous,
        { role: "customer", text: cleaned },
        { role: "guide", text: "", pending: true },
      ];
    });
    setBusy(true);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const update = (patch: Partial<Message>) =>
      setMessages((previous) =>
        previous.map((message, index) =>
          index === slot ? { ...message, ...patch, pending: false } : message,
        ),
      );

    try {
      // Readings come from the Fabric data agent over MCP; the model only puts them into words.
      const measured = config.dataAgentReady
        ? await askDataAgent(config.dataAgentToken, cleaned, controller.signal)
        : "";
      const answer = await askOpenAI(
        config.endpoint,
        config.deployment,
        config.apiKey,
        cleaned,
        controller.signal,
        buildSystemPrompt(household, measured),
      );
      update({ text: answer, measured, ...followUp(cleaned, answer) });
    } catch (error) {
      update({
        text: "",
        error:
          error instanceof Error
            ? error.message
            : "The energy guide could not answer that.",
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!initialQuestion || started.current) return;
    started.current = true;
    void ask(initialQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  return (
    <Dialog
      title="Your energy guide"
      className="guide-dialog"
      onClose={() => {
        abort.current?.abort();
        onClose();
      }}
    >
      <div className="guide-intro">
        <Sparkles size={22} />
        <Badge tone={config.dataAgentReady ? "green" : "amber"}>
          {config.dataAgentReady
            ? "Live answers from the Fabric data agent over MCP"
            : "Connect the Fabric data agent for your own readings"}
        </Badge>
      </div>
      <AgentSettings config={config} />
      <div className="guide-messages" aria-live="polite">
        {messages.length === 0 && (
          <div className="guide-welcome">
            <h3>What is on your mind?</h3>
            <p>Your routine, your bill, or your wider impact.</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            className={`guide-message ${message.role}`}
            key={`${index}-${message.role}`}
          >
            <span className="message-author">
              {message.role === "customer" ? "You" : "Energy guide"}
            </span>
            {message.pending && (
              <p className="guide-pending">Checking your readings...</p>
            )}
            {message.error && (
              <p className="guide-error" role="alert">
                {message.error}
              </p>
            )}
            {message.text && <p>{message.text}</p>}
            {message.measured && (
              <details className="guide-measured">
                <summary>
                  <Database size={13} /> From your Fabric data agent, live
                </summary>
                <p>{message.measured}</p>
              </details>
            )}
            {message.action && (
              <button
                className="text-button"
                onClick={() => onAction(message.action!)}
              >
                {message.label}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="guide-suggestions">
        {[
          "Why the evening peak?",
          "What is my global impact?",
          "Compare my tariffs",
          "What about solar?",
        ].map((prompt) => (
          <button key={prompt} disabled={busy} onClick={() => void ask(prompt)}>
            {prompt}
            <ArrowRight size={13} />
          </button>
        ))}
      </div>
      <form
        className="guide-form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <input
          aria-label="Question for the energy guide"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about your electricity..."
          maxLength={MAX_QUESTION_LENGTH}
          disabled={busy}
        />
        <button
          className="icon-button send-button"
          type="submit"
          disabled={busy || !question.trim()}
          aria-label="Send question"
          title="Send question"
        >
          <Send size={19} />
        </button>
      </form>
    </Dialog>
  );
}
