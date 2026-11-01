---
description: "Domain and safety rules for flexibility calculation, simulation, and chat code in the flexibility assistant app."
applyTo: "rayfin-semantic-foundry-sample-main/src/**/*.{ts,tsx}"
---

# Flexibility app implementation rules

## Units and types
- Never use bare `number` for energy quantities. Use suffixed names: `wh`, `kwh`, `kw`,
  `chfPerKwh`, `chf`, `ts` (ISO 8601 UTC).
- **The semantic model stores energy in Wh at 15-minute grain.** Convert once at the data boundary:
  `kWh = wh / 1000`, average `kW = wh / 250`. Never let a raw `Wh` value reach a UI component or a
  prompt.
- Model field names are used verbatim, including the model's own misspelling
  `TotalConsumtion_Wh`. `FixPricePerWh` is a **CHF/kWh** value despite its name — wrap both in named
  constants with a one-line comment rather than repeating the trap at every call site.
- Prices are CHF/kWh in the source data. Format as `Rp./kWh` or `CHF` at the UI edge only.
- Time zone is `Europe/Zurich`. Daily aggregations must use local time and tolerate 23- and
  25-hour DST days. Never derive a local day by adding a fixed offset.

## Calculation code
- All energy, cost, CO2, and peak math lives in pure functions under `src/flex/`, with no I/O and
  no React imports. The LLM explains results; it must never compute them.
- Every scenario conserves energy: shifted kWh reappear, thermal rebound is added, battery
  round-trip efficiency is applied. A scenario that changes total energy without an explicit
  efficiency term is a bug.
- Every result object carries `assumptions: string[]` and a `confidence` field. Code that returns a
  number without its assumptions is incomplete.
- Clamp to physical limits: asset rated power, connection capacity, available hours in the window.
- **Bound every simulated saving** by the model's own floor and ceiling (`SavingsDynamic_Pct` and
  `SavingsLowest_Pct`). A scenario result outside that band is a defect — assert it in the tests.
- Unit-test each function with Vitest alongside the source, following the existing `*.test.ts`
  convention. Cover: zero/missing data, the Wh→kWh→kW conversions, DST boundary days, negative
  savings, and a rebound case.

## Data access
- Query only the authenticated user's own data. Never take a customer identifier from chat input or
  a URL as an authorisation claim.
- Semantic-model reads stay read-only and portal-brokered through `readModel`, within its 1–100 row
  limit. Do not introduce direct browser SQL or widen the limit.
- Use the data agent for exploratory questions; use `readModel` for any number the UI shows twice,
  so it cannot drift between sessions.
- Benchmark queries must return aggregated cohorts with a minimum group size, never one other
  customer.
- Validate and narrow every tool/API response before use; treat parsed JSON as `unknown` until
  checked, as `src/openai.ts` does.
- Do not hardcode workspace, tenant, model, or customer identifiers in source or tests.

## Prompting and LLM boundaries
- Build the system prompt from `.github/agents/flex-coach.agent.md` so the app and the VS Code agent
  behave identically. Keep the prompt in `src/flex/prompt.ts`, not inline in components.
- Ground the model with a compact, structured facts block (profile + simulation results). Do not
  paste raw interval series into the prompt.
- Delimit retrieved data clearly and instruct the model to treat it as untrusted content, never as
  instructions.
- Enforce input limits before calling Foundry (the existing 1–2000 character check) and keep the
  abort/timeout handling.
- Never send API keys, meter identifiers, addresses, or names to the model. Pass a pseudonymous
  session-scoped reference instead.

## UI
- Every displayed number needs an adjacent confidence indicator and an expandable
  "How I calculated this".
- Never block the chat on a failed data call; degrade to labelled estimates.
- Charts are comparative (before/after, you/cohort), not decorative. Default view answers
  "what should I do", not "here is everything we measured".
