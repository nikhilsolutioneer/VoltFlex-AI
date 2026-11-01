# Flex XP: Gamification Logic

## Status And Purpose

The optional Energy Momentum story is implemented in the local prototype, replacing Grid Defender. Its accumulating CHF-linked demo coins are distinct from the Flex XP mission, completion, badge and squad system described below, which remains a design specification. Neither layer authorizes production integrations.

Encourage a first flexibility trial, repeated feasible actions, and informed interest in a future flexibility programme through non-financial progression and optional social participation.

The primary audience is people who enjoy achievement, collecting, cooperation, or competition. These motivations may appeal to some Gen Z users, but age alone is not a reliable basis for choosing the experience.

## Energy Momentum: Implemented Story Layer

Open **Start my story** beside My Electricity, or **Energy Momentum** in the header. The technical views remain available without playing. The former fourth board is removed, leaving five customer-paced screens:

1. **Home:** one simple cutaway house or apartment building based on the household profile. Only confirmed PV, battery, heat pump, EV, water heater, lighting and appliances appear. Yellow dots move along their connections; completed demo actions turn the matching equipment green with a check.
2. **Timing:** before/after consumption and shaded differences, with an aligned dynamic tariff beneath. The selected flexibility has a clearly labelled synthetic action profile, not the customer's meter trace.
3. **Actions:** an icon-led action/consequence list. An eligible action click awards its displayed coins, records one demo occurrence and opens Lumi's explanation of the practical step, benefit and constraints.
4. **Ranking:** six fictional participant balances and the user's current total. Gold, silver and bronze medals identify the top three places; other rows remain simple. The motivational example is explicitly a demo, not customer social proof.
5. **Wrap-up:** an animated sum, flying coins and fireworks. Completed actions show their counts and accumulated coins; remaining actions are grey, hatched and locked. The action history can be downloaded privately.

Lumi is a locally authored energy sprite with short contextual speech bubbles on every screen. Equipment and guide tips work with hover, focus and touch.

### Demo Coins And Action History

| Measure | Implemented demo rule | Meaning |
|---|---|---|
| Action coins | Exactly the displayed CHF saving, at 1 coin per CHF 1 | Illustrative savings, including fractional coins; not cash or redeemable rewards |
| Total balance | Sum of the recorded rewards in integer cents | Demo progress, not verified household savings |
| Completion count | One occurrence per eligible action click | A simulated repeat, not evidence of an actual device action |
| Example history | Two occurrences of the first eligible action and one of the second, when available | Preloaded examples, explicitly disclosed in the wrap-up |
| No reward | Unconfirmed equipment, invalid capacities, missing dependent equipment or shared/building-level approval | No device control or permission is invented |

Rewards derive from the difference between each example's before/after variable electricity costs on the illustrative dynamic tariff. Capacity limits apply. Battery charging includes 10% loss and a 3 kW limit; solar self-consumption needs a confirmed flexible appliance and includes forgone export income. Lighting is reduced, not deferred. Thermal examples assume safe schedules and preserved comfort, which need verification in a real home.

Each action is an independent example. Adding occurrence rewards does not claim a combined-day energy forecast, seasonal saving, avoided emissions or verified grid service. Buying equipment and simply navigating, reopening or downloading do not earn coins. The old fixed 30-coin/40-grid-point previews are removed. The separate 25-XP production completion policy below is not implemented.

The action journal is held in App state and survives story close/reopen and in-app navigation. Reloading starts a new demo visit. Household changes affect future eligibility and rewards without rewriting past occurrences or the original meter readings. The existing saved-plan storage is unchanged.

### Accessibility And Privacy

- Manual progress, Back and Close controls; no timer, automatic chapter advance, sound or streak pressure.
- Responsive desktop/mobile window, keyboard focus containment and restoration, focused chapter headings, motion pause and reduced-motion support.
- Next and Back remain in a fixed footer. Opening an action brings Lumi's explanation into view. Escape dismisses an open tooltip without closing the story.
- Decorative motion is disabled for reduced motion; the full coin total is then displayed directly. Pause also freezes the JavaScript coin counter, with resume continuing from its current value.
- The user-triggered Markdown recap contains action names, counts and labelled demo savings, but no household readings or peer ranking. Nothing is posted or sent.
- A real ranking requires relevant, dated, anonymised data, consent and fair matching. The current fictional leaderboard does not establish actual participation or financial results.

### Prototype Checks

Unit tests cover CHF/coin equality, repeat counts, energy conservation, battery losses, export income, capacities, eligibility and both shared-equipment and building-level permissions. Official Microsoft Playwright tests cover all five screens on desktop/mobile, all seven equipment types, empty states, ranking medals, locked/completed history, close/reopen totals, private downloads, tooltips, responsive widths and moving/paused animations.

Implementation: [EnergyMomentum.tsx](app/src/EnergyMomentum.tsx), [MomentumScene.tsx](app/src/MomentumScene.tsx), [MomentumChart.tsx](app/src/MomentumChart.tsx), [energyStory.ts](app/src/energyStory.ts), and [momentum.spec.ts](app/tests/momentum.spec.ts).

## Flex XP: Proposed Completion Layer

The remaining sections specify a later, evidence-labelled participation system. The story's click-based demo occurrences and CHF-linked coins do not count as completed real-world opportunities under these rules.

## Core Principles

- Participation is optional. The practical electricity experience remains available without gamification.
- Points have no monetary or redemption value. No cash, discounts, vouchers, tariff rewards, or financially valuable prizes.
- Reward follow-through on a feasible action, not the largest electricity consumption or reduction.
- Do not encourage extra charging, appliance cycles, equipment purchases, or unnecessary curtailment to earn points.
- Preserve readiness, comfort, control rights, manual overrides, and visibility of customer-cost tradeoffs.
- Keep personal progress private by default. Sharing or provider visibility never earns extra XP.
- Distinguish planned, self-reported, measured, and modelled information wherever it appears.
- Never imply that a score proves avoided emissions, reduced congestion, or environmental superiority.

## Recommended Experience

**Choose a mission -> make a small commitment -> report an eligible action -> receive XP -> optionally contribute to a squad -> review the week.**

Illustrative example, assuming the sessions were needed and the selected schedule was feasible:

> Mission: Try the agreed charging schedule for two sessions this week.
>
> Progress: 2 of 2 completed, self-reported.
>
> Achievement: +50 XP. Weekly goal reached.
>
> Optional next step: Preview your contribution to a squad challenge.

This is an example of the proposed experience, not an observed household result.

## Missions And Eligibility

A weekly mission contains a small number of agreed opportunities to perform an action. Each opportunity represents one actual, already-needed activity, not an app interaction.

For the first prototype, start with a charging trial based on the existing scenario comparison. Reuse its equipment confirmation, schedule feasibility, ready-by time, and approval requirements.

Before starting a mission:

1. Confirm the household has the relevant equipment and decision rights.
2. Choose a feasible action and review any estimated cost or comfort tradeoffs.
3. Agree a weekly target, initially one, two, or three expected opportunities.
4. Choose a practical cue, such as checking the timer when plugging in.
5. Keep participation private unless the user explicitly chooses another visibility option.

A cheaper hour is not automatically a cleaner or grid-beneficial hour. The prototype's example network window must not be presented as a live EKZ request.

Households with shared equipment or missing permission receive an assessment or discussion next step, not an actionable charging mission. Households with no suitable flexibility receive a neutral state, not a failed score. Learning and setup milestones can be acknowledged separately without pretending they are completed electricity shifts.

Existing beneficial routines can count when they meet the same eligibility rules. Users should not need to interrupt a good routine and restart it to participate.

## Scoring Rules

The following numbers are proposed prototype defaults to test, not a finalized programme policy.

| Measure | Proposed rule | Meaning |
|---|---|---|
| Lifetime XP | 25 XP per distinct, eligible, completed opportunity | Accumulated participation |
| Level | Start at level 1; advance one level per 100 XP | Symbolic progression |
| Weekly progress | Completed opportunities out of agreed eligible opportunities | Personal follow-through |
| Physical impact | Display separately, only with its evidence and calculation boundaries | Energy effects, not points |

Examples:

- Two eligible completions award 50 XP, whether the sessions involved a small or large amount of energy.
- Four eligible completions total 100 XP and reach level 2.
- Completing a weekly mission does not award another 25 XP on top of its individual opportunities.
- Starting a mission, saving a plan, opening the app, or checking an existing preparation task awards no XP.

Lifetime XP is the sum of valid completion awards. It does not expire when a week ends or the user pauses. Correcting an accidental or duplicate completion removes that record's award; this is data correction, not a missed-week penalty.

### Award Once

- Give each opportunity a stable identity and allow at most one active completion award for it.
- Repeated clicks, reloads, checklist toggles, retries, and re-reporting the same opportunity must not accumulate XP.
- Correcting and then restoring a completion restores its original award; it does not create an additional award.
- The same real-world activity must not count toward multiple mission slots or weeks.
- Calculate totals from completion records rather than incrementing an editable XP counter independently.
- Self-reporting remains a trust-based mechanism. Local storage cannot prove an action happened or provide tamper-resistant competition.

### Weekly Progress

- Show a count such as "2 of 3 completed", with the reporting source beside it.
- Use a clearly displayed calendar-week period in the user's local timezone. Keep an opportunity assigned to its original period.
- Record completed, not yet reported, skipped, and unavailable opportunities separately.
- Missing evidence is unknown, not a confirmed failure or a completion.
- No eligible opportunities means "No opportunities this week", not a zero performance score.
- If expected opportunities do not materialize, disclose any adjustment to the target. Reducing a denominator alone must not earn a goal-completion badge.
- A missed week does not erase earlier achievements or trigger a punitive streak reset.
- Self-selected goal completion is useful for personal progress, but is not automatically a fair ranking between households.

## Badges And Recognition

| Badge | Proposed requirement |
|---|---|
| First Trial | One valid eligible completion |
| Weekly Goal | Reach the agreed positive weekly target through completed opportunities |
| Routine Builder | Reach a weekly goal in three distinct weeks; they need not be consecutive |

Badges can unlock titles, cosmetic profile options, or a restrained completion animation. They must not unlock essential functionality, better service, or financial benefits.

Each badge reflects the evidence behind its achievements. A self-reported badge is not an EKZ verification mark. Badges based on corrected records should be recalculated consistently.

Avoid expiring rewards, paid streak recovery, loot boxes, and public labels that imply someone is a bad customer. Recognition should acknowledge a specific action rather than moral worth.

## Squad Quests And Social Norms

Cooperation is the first social mechanic to explore. Competitive rankings are a later, optional branch.

- A user can choose to contribute eligible mission completions to a shared goal.
- Count comparable completed opportunities, not raw kWh or equipment ownership.
- Show the user's own contribution separately from the group total.
- Do not mix pledges with completed actions, or self-reported actions with verified results, without separate labels and totals.
- Contributing to a squad awards no additional personal XP. Private users have the same progression opportunities.
- Changing squads must not duplicate a completion across current group totals.
- Leaving optional sharing stops future contributions. Any retention of prior aggregate contributions must be explained before joining.
- Share only the status or contribution the user selected, not household load traces, occupancy clues, or a public list of inactive members.

A statement such as "people like you are participating" requires real, relevant, dated aggregate data. A growing-participation message requires an observed trend. Do not invent a majority or present a modelled community as social proof.

For a local-only prototype, use a clearly labelled squad preview or sample challenge. Do not imply that another person has joined, received a message, or seen a contribution. Real team membership and shared totals require a separately scoped service and consent model.

An optional friends league can be considered later only when mission eligibility, opportunity counts, and evidence are comparable. Do not rank households by electricity volume or turn a personal, adjustable target into an apparently objective competitive score.

## Self-Monitoring And Observability

| Visibility mode | What it could show | Requirements |
|---|---|---|
| Private progress | Personal mission, XP, badges, and weekly review | Default; no social sharing required |
| Chosen buddy or squad | A selected commitment, badge, or minimal contribution | Explicit opt-in and a clear audience |
| EKZ acknowledgment | Receipt of a trial commitment or feedback supported by actual evidence | Explicit purpose, data access, and distinction between automated and human review |

Private self-monitoring, peer accountability, and provider observation are different mechanisms and should be tested separately.

Do not imply that EKZ has verified a result merely because a user reported it. Do not create a provider-visible customer rating or suggest that a gamification score affects tariffs or service. Any optional programme processing must be distinguished from metering already used for billing or operations.

A shareable weekly recap should be user-triggered and previewed before sharing. It can contain a chosen badge or completion count and its evidence label, without detailed consumption data. Essential features and earned XP remain available when sharing is declined.

## State And Lifecycle

These are conceptual requirements for later implementation, not a new application schema.

| State | Expected behavior |
|---|---|
| Not started | No mission, no assumed participation, and no completion award |
| Active | Show target, agreed action, opportunity status, and reporting source |
| Paused | Stop prompts and new awards; retain valid history |
| Needs review | Household or scenario changed; block new reports until eligibility is checked again |
| Goal reached | Recognize the goal once and offer an optional review or next mission |
| Week ended | Preserve history; distinguish completed, unreported, skipped, and unavailable opportunities |
| No eligible opportunities | Neutral state with no failure score |

Store enough information to associate a mission with its agreed action, household assumptions, period, target, opportunity identities, reporting source, completion records, and visibility choice.

Starting or replacing a weekly mission must not silently delete valid lifetime achievements. Existing saved drafts must remain readable. If storage is unavailable, show that progress is not saved rather than silently implying persistence. Offer deliberate deletion of local gamification history separately from deleting a practical plan.

## Evidence And Prototype Boundaries

The current app uses illustrative scenarios and locally saved plans. Connected results tracking, actual squads, and provider acknowledgment are not available in the existing experience.

For an initial prototype:

- Label recorded achievements as self-reported, or use unmistakably labelled sample data.
- Keep the existing plan checklist separate from mission completion reporting.
- Do not treat simulation results as historical progress.
- Do not display invented real participants, leaderboards, or provider confirmation.
- Do not imply a timer, contract, or device was changed by saving a mission.
- Do not add live messaging, analytics, notifications, device control, or programme enrollment implicitly.

For a later connected version, define what meter or device evidence can actually establish. Whole-house readings alone do not reliably confirm a specific appliance action. An observed household change is not automatically proof of caused grid relief or avoided emissions.

## Validation Before Rollout

1. Compare the same mission and feedback with and without XP, levels, and badges. Keep prompts and opportunities consistent.
2. Test comprehension and appeal across motivation preferences and ages rather than assuming a Gen Z effect.
3. Add a cooperative squad variant after evaluating the private experience. Test competitive rankings and EKZ visibility separately.
4. In an approved, consented behavioral pilot, evaluate eligible follow-through and persistence, not app opens or points earned alone.
5. Monitor perceived pressure, privacy understanding, opt-outs, comfort, readiness, customer costs, and additional energy use.

### Acceptance Examples

- Reporting one eligible opportunity twice still produces only 25 XP.
- Correcting that report and restoring it still results in 25 XP, not 50 XP.
- A saved plan or checked preparation task alone produces no XP.
- Two eligible self-reported completions show 50 XP and retain the self-reported label after reload.
- A household without the equipment or control rights cannot start an incompatible action mission.
- Changed household assumptions block new completion awards pending review, without deleting earlier valid history.
- A week with no eligible opportunities shows no failure score and awards no goal badge.
- A skipped week or declined squad invitation does not reduce earned XP.
- A squad preview never claims a real group result or that information was sent to EKZ.
- Existing version-1 saved drafts remain usable when gamification is later added.

## Existing Implementation Anchors

- [Project brief](EKZ-FLEXIBILITY-BRIEF.md): household constraints, journey, and uncertainty boundaries.
- [app/src/opportunities.ts](app/src/opportunities.ts): opportunity selection and scenario construction.
- [app/src/views.tsx](app/src/views.tsx): comparison, personal trial checklist, stale-plan protections, and illustrative collective impact.
- [app/src/storage.ts](app/src/storage.ts): current saved-plan validation and local persistence.
- [app/src/storage.test.ts](app/src/storage.test.ts): saved-draft compatibility checks.
- [app/tests/journey.spec.ts](app/tests/journey.spec.ts): current trial, approval, persistence, and disclosure journeys.

## Suggested First Scope

Start with an optional private charging mission, idempotent self-reported XP, weekly progress, and three milestone badges. Add a clearly labelled squad preview to discuss the hybrid without claiming a connected community.

Defer actual squad services, competitive rankings, provider acknowledgment, and measured-impact achievements until their evidence, fairness, privacy, and operational requirements have been agreed.