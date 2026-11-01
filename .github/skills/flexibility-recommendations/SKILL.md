---
name: flexibility-recommendations
description: "Turn flexibility analysis into ranked, concrete, comfort-safe actions a customer can take. Use when asked 'what should I do', 'how do I start', 'give me tips', for personalised energy advice, next-best-action ranking, automation suggestions, onboarding nudges, or converting a simulation result into a decision the customer can act on today."
argument-hint: "Customer profile to generate recommendations for"
---

# Flexibility Recommendations

A recommendation is only worth making if the customer can do it **this week**, knows exactly what it
costs them in comfort, and can see what it gives back.

## When to use

Always as the final step of a flexibility conversation. Never before the `flexibility-profiling`
and `dynamic-tariff-simulation` skills have produced grounded numbers.

## Ranking

Score each candidate action, then present at most three:

```
score = value_chf_per_year
      × effort_factor        # 1.0 automated once, 0.6 weekly habit, 0.3 daily manual
      × comfort_factor       # 1.0 imperceptible, 0.7 minor, 0.3 noticeable, 0 unacceptable
      × confidence           # 0.3 assumed asset ... 1.0 measured
      + engagement_bonus     # small, for the first action only — momentum matters
```

Drop anything with `comfort_factor = 0` outright, regardless of value. Drop anything requiring
hardware the customer does not own unless they explicitly asked about investments.

## Recommendation shape

Every recommendation carries these six fields. If you cannot fill one, you are not ready to
recommend it.

| Field | Example |
|---|---|
| **Action** | "Set your wallbox to start at 01:00 instead of on plug-in" |
| **Value** | "≈ CHF 15/month, ≈ CHF 180/year" |
| **Comfort cost** | "None — the car is still full by 07:00" |
| **Effort** | "One setting in the wallbox app, once" |
| **Why it works** | "Your night tariff is 8 Rp./kWh cheaper across energy and grid" |
| **How to verify** | "Check next month's bill, or come back and I'll compare" |

## Tiering

Lead with the cheapest, safest tier and only escalate when the customer asks.

1. **Free, today** — retime the boiler, start the dishwasher after 20:00, set the EV start time,
   move laundry into the PV window. No money, no hardware, reversible.
2. **Settings and automation** — wallbox schedules, heat pump curves, smart plugs, PV-surplus
   charging. Small effort, durable value, no behaviour decay.
3. **Contract** — switch to a dynamic or ToU tariff, join a ZEV / local community. Only when the
   simulation shows the customer's *current* pattern already wins, or automation is in place.
4. **Investment** — battery, bigger PV, bidirectional charger. Only on request, always with payback,
   risk, and a plain statement when it does not pay.

## Presentation to the customer

- **One primary action per turn.** A list of eight is a list of zero.
- Lead with the number, then the comfort cost in the same breath.
- Offer a single next step: *"Want me to write out the exact wallbox settings?"*
- Make it reversible and say so — reversibility is what makes people try things.
- Follow up. Save accepted actions, then measure and report back. A verified CHF 14 saved beats a
  promised CHF 200.

## Hard rules

- **Never recommend something you have not simulated.** No generic energy tips.
- **Never recommend an action the customer already does.** Check the load curve first; telling
  someone to do what they already do destroys credibility instantly.
- **Never recommend against comfort, health, or safety.** No shifting medical equipment, no
  under-heating, no bypassing the legionella cycle, no DIY electrical work.
- **Never recommend the dynamic tariff on its own.** On the current dataset the average customer
  pays ~5% *more* by switching without changing behaviour. The tariff is the reward for shifting,
  not the cause of it — recommend the shift first, the switch second, and only if the numbers flip.
- **Never recommend based on an asset you only inferred**, unless you say it is an inference and
  ask the customer to confirm it: *"It looks like something large runs around 18:00 — is that your
  car charging?"* One confirmation turns a guess into a grounded recommendation.
- **Disclose the downside.** Dynamic tariffs carry price risk; batteries degrade; pre-heating costs
  efficiency. Saying it first is what makes the rest believable.
- **Anti-herding**: when advising many customers, randomise start times within the cheap window.
  Synchronised optimisation creates the exact peak the system was trying to avoid — and with 03:00
  as the obvious cheapest hour for everyone in this dataset, that risk is concrete.

## Example turn

> **Your biggest win: delay EV charging to 01:00.**
> - ≈ **CHF 15/month** (CHF 180/year) at your current tariff
> - Comfort: none — car is full by 07:00, based on your last 30 days of plug-in times
> - Effort: one setting in your wallbox app, reversible any time
>
> Want the exact steps for your charger?
