# EKZ Customer Flexibility Prototype

A working UI for team discussion. All readings, rates, network signals, equipment capacities and climate factors are illustrative. There is no live Fabric connection, device control or customer transaction.

See [EKZ-FLEXIBILITY-BRIEF.md](../EKZ-FLEXIBILITY-BRIEF.md) for the discussion brief.

## Run Locally

Use Node.js 22.12 or newer; tested with Node.js 26.8.1. From the workspace root:

```sh
cd app
npm ci
npm run dev -- --host 127.0.0.1
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173/`. If occupied, Vite chooses another port. This is a local prototype, not a shared deployment.

## Team Walkthrough

1. **My Electricity:** inspect a 96-interval example day. Confirm, reject or leave uncertain the possible EV pattern. Corrections change recommendations, not the original readings.
2. **My Impact:** distinguish personal cost, grid effects and the estimated electricity footprint. Adjust hypothetical participation to explore collective effects.
3. **My Opportunities:** compare no-investment options and optional solar/storage investments. Removing an EV removes the EV opportunity; unconfirmed equipment receives no quantified charging saving.
4. **Compare an Option:** change charging times or tariffs, or explore solar, storage and PV curtailment. Infeasible charging windows cannot be saved. The table separates tariff-only, usage-only and combined costs.
5. **My Next Step:** save a draft, check tasks, add notes and download a Markdown plan. Reloading restores the saved draft. Changed household details flag it for reassessment.

Open **My household** to change building type, meter scope, shared equipment or resident/manager role. Any combination of PV, heat pumps, electric water heaters, EVs, lighting, appliances and batteries is supported in the household picture.

The **Energy guide** is a labelled scripted demonstration grounded in the same model. It explains patterns and opens views; it is not a connected AI agent.

## Energy Momentum Story

Select **Start my story** on My Electricity or **Energy Momentum** in the header. The former separate difference board is removed; five customer-paced screens remain:

1. **Home:** one illustrated single-family home or multi-family building. Only confirmed equipment appears, with yellow electricity dots, equipment tips and green checks for completed demo actions. Lumi, an illustrated energy sprite, offers a contextual speech bubble on every screen.
2. **Timing:** before/after consumption curves with shaded differences, plus the illustrative dynamic tariff on the same time axis. Select a confirmed, permitted flexibility to see its example schedule and CHF saving.
3. **Actions:** a compact action/consequence list. Clicking an eligible action opens Lumi's explanation and records a demo occurrence. The displayed CHF saving is exactly its coin reward, including fractional coins.
4. **Ranking:** six explicitly fictional participants and the current user's demo balance, sorted by coins. The first three places have gold, silver and bronze medals.
5. **Wrap-up:** an animated coin total, flying coins, fireworks and the action history. Completed actions lead the list with counts and cumulative savings; untried actions are grey, hatched and locked. A private Markdown recap can be downloaded.

- **1 coin = CHF 1 of illustrative savings**, not redeemable money or a verified result. Calculations and accumulated balances use integer cents, so the displayed reward and recorded amount agree.
- Up to three preloaded example occurrences come from the first two eligible actions. Every action click deliberately records another demo occurrence; navigation, reopening and downloads do not award coins.
- Equipment capacity, battery losses and solar export income affect the estimates. Unconfirmed equipment, invalid capacities and missing shared/building-level permissions cannot earn coins. No equipment purchase is rewarded.
- The chart uses a separate synthetic example profile for each action. These are independent examples, not a combined household forecast and not a replacement for the original meter readings. Comfort, available sunlight, readiness and actual device state still need verification.
- The action journal stays in App state across navigation, household editing and story close/reopen. Reloading the app resets it. Only the existing saved-plan snapshot uses browser storage.
- Tooltips support hover, keyboard focus and touch. Animations can be paused; reduced motion disables decorative motion and displays the final total directly. No device, tariff or contract is changed.

See [EKZ-GAMIFICATION-LOGIC.md](../EKZ-GAMIFICATION-LOGIC.md) for this demo ledger's distinction from the future evidence-based completion XP system.

## Calculation Boundaries

- One synthetic meter trace is provided. Changing building type changes its interpretation and control permissions, not the dataset. Distinct authorised single-/multi-family traces are a later requirement.
- The EV example attributes a 3.6 kW, two-hour block to charging only after confirmation. The schedule must deliver the same 7.2 kWh before departure. Vehicle discharge is not assumed.
- PV uses an illustrative daylight profile. Existing generation can be curtailed, never raised beyond available sunlight. No compensation or nighttime output is invented.
- Additional storage has a 3 kW limit, 90% round-trip efficiency and an empty-to-empty daily cycle. Solar and storage share one energy balance; savings are not added independently.
- The main analysis does not quantify heat pumps, water heaters, lighting or appliances without comfort, hygiene, timing and control details. Energy Momentum has separately labelled example actions with explicit schedule assumptions, not verified household estimates.
- Shared equipment and multi-family building-level meters require an approval-oriented next step for residents and dwelling owners. A manager role is an assumption, not verified authorisation.
- Annual values repeat one day 365 times, not a seasonal forecast. Bills include illustrative rates, stated standing charges and assumed export payment. Actual eligibility and all charges need verification.
- Payback uses incremental equipment savings at the same selected tariff, excluding tariff-only savings. The capital range is +/-20%; financing, maintenance, degradation, subsidies and quotes are not modelled.
- Climate estimates cover imported operational electricity, not a full household or life-cycle footprint. Collective results are linear what-ifs, not verified avoided emissions or network forecasts.
- Only a saved-plan snapshot persists in browser storage. Unsaved household edits last for the session. No data goes to a provider, installer or device.
- Results review, actual programme participation, tariff switching and automation remain future work.

## Verification

From the app directory:

```sh
npm run build
npm run lint
npm test
npx --no-install playwright install chromium
npm run test:ui
```

Browser tests use **Microsoft Playwright**, from the official [microsoft/playwright repository](https://github.com/microsoft/playwright) and its documented `@playwright/test` npm distribution. No unofficial fork, browser wrapper or third-party installer is required.

The lockfile pins `@playwright/test`, `playwright` and `playwright-core` to `1.63.0`. On 10 September 2026 their repository metadata, official npm registry URLs and published integrity hashes were checked against the lockfile. Use `npm ci` to reproduce those versions.

Model/storage/story unit tests and Playwright desktop/mobile journeys cover inference correction, shared and building-level permissions, invalid schedules, flat-rate timing, PV direction, battery balance, payback attribution, persistence, downloads, impact, guide navigation and Energy Momentum. Story checks cover all seven equipment types, exact CHF/coin rewards, repeated actions, close/reopen history, locked rows, ranking medals, keyboard tooltips, reduced motion, moving electricity dots and the paused/resumed coin count. All five story screens are checked at 320, 768 and 1920 pixel widths.

Screenshots go to `test-results/screens/`; the HTML report goes to `playwright-report/`. Playwright reuses the configured local server or starts one. Use `EKZ_PORT=5174 npm run test:ui` for another port, and `npx --no-install playwright show-report` to inspect results.

The production build has a non-blocking bundle-size warning for the chart-heavy JavaScript bundle. Production performance tuning and a full accessibility audit remain necessary.

## Implementation Map

- [src/App.tsx](src/App.tsx): routing, household/scenario state, dialogs and plan flow.
- [src/views.tsx](src/views.tsx): the four screens and the impact tab.
- [src/HouseholdEditor.tsx](src/HouseholdEditor.tsx): building, meter, roles and equipment.
- [src/model.ts](src/model.ts): example readings, tariff costs and constrained scenarios.
- [src/opportunities.ts](src/opportunities.ts): options and default comparisons.
- [src/EnergyGuide.tsx](src/EnergyGuide.tsx): scripted conversational preview.
- [src/EnergyMomentum.tsx](src/EnergyMomentum.tsx): five-screen story, action list, ranking and animated recap.
- [src/MomentumScene.tsx](src/MomentumScene.tsx): household-specific artwork, equipment tips and Lumi.
- [src/MomentumChart.tsx](src/MomentumChart.tsx): aligned consumption and dynamic-price charts.
- [src/energyStory.ts](src/energyStory.ts): example schedules, eligibility, CHF/coin calculations, history and ranking.
- [src/storage.ts](src/storage.ts): validated local drafts and downloads.
- [tests/journey.spec.ts](tests/journey.spec.ts): Microsoft Playwright journeys and screenshots.
- [tests/momentum.spec.ts](tests/momentum.spec.ts): Microsoft Playwright story interactions, accessibility checks and screenshots.

Rayfin on Microsoft Fabric is the target, not an implemented integration. Before connecting it, establish consent/authentication, hosting requirements, meter units/timezone/DST, missing-data handling, actual tariffs/eligibility, applicable grid signals and generation/export telemetry.

The solar photograph is served locally from `public/solar-roof.jpg`; [original source](https://images.unsplash.com/photo-1508514177221-188b1cf16e9d). It is illustrative, not the customer's property. Styling is a concept, not a verified EKZ design-system implementation.
