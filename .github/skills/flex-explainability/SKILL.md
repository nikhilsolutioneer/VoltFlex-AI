---
name: flex-explainability
description: "Explain energy, flexibility, tariff, and CO2 concepts to non-expert customers in plain language, and make AI-generated numbers transparent and trustworthy. Use when a customer asks 'what does that mean', 'why', 'where does that number come from', when translating kWh/kW/jargon, writing customer-facing copy or UI microcopy, handling scepticism, or disclosing assumptions, uncertainty, and AI limitations."
argument-hint: "Concept or number to explain"
---

# Flexibility Explainability

Understanding is the product. A correct number nobody understands has zero value.

## When to use

Continuously — in every customer-facing sentence. Explicitly when the customer asks "why", "what
does that mean", or pushes back on a figure.

## Translation table

| Say this | Not this |
|---|---|
| "About as much as running your dishwasher twice" | "3.2 kWh" *(alone)* |
| "How fast you're using power right now" | "Instantaneous demand in kW" |
| "Moving when you use power, not how much" | "Load shifting / demand-side flexibility" |
| "Your car charges while you sleep, when power is cheaper" | "Optimised overnight dispatch" |
| "The grid is busiest around 18:00 on winter evenings" | "System peak coincidence factor" |
| "Using your own solar power instead of selling it cheap" | "Self-consumption optimisation" |
| "Prices change every hour, so you can pick cheap ones" | "Spot-indexed tariff" |

Use the number **and** the analogy, not one or the other: *"3.2 kWh — about two dishwasher runs."*

## The kW vs kWh problem

This confuses almost everyone, and it is the root of most misunderstandings about peaks and capacity
tariffs. Use the water analogy once, then stay consistent:

> **kW** is how fast the tap runs. **kWh** is how much ended up in the bucket.
> A capacity tariff charges you for the widest you ever opened the tap, even for a minute.

## Explaining any number

Four parts, in this order, in one or two sentences:

1. **The number**, rounded to a decision-relevant precision. CHF 180, not CHF 178.43.
2. **Where it came from** — "from your actual meter data for the last 30 days".
3. **The key assumption** — "assuming you keep driving about the same".
4. **The uncertainty** — "somewhere between CHF 110 and CHF 240 depending on prices".

False precision is a trust bug. If the uncertainty band is ±40%, three significant figures are a lie.

## Handling scepticism

| Customer says | Respond by |
|---|---|
| "That seems too good to be true" | Showing the arithmetic in one line, then offering the conservative case |
| "I don't want to change my life" | Reframing to automation: "you set it once, then forget it" |
| "Will my house be cold?" | Naming the exact comfort constraint being protected, and that it is reversible |
| "Is my data being used against me?" | Stating plainly what is read, why, and that it stays with the utility |
| "Does this even matter?" | Individual number first, then the honest aggregate effect |

## AI transparency

- Say when something is an **estimate from a model** versus a **measurement**.
- Never fabricate a figure to sound helpful. "I don't have that" is a complete answer.
- If confidence is low, lead with that: *"Rough estimate — I can't see your heating separately."*
- Offer the path to certainty: what data or answer would sharpen the number.
- Do not imply the assistant can control devices, change contracts, or guarantee outcomes.

## Microcopy patterns for the UI

- **Empty state**: "No meter data yet — tell me your heating type and I'll estimate."
- **Low confidence badge**: "Estimate · based on similar homes"
- **High confidence badge**: "From your meter · last 30 days"
- **Assumption disclosure**: a persistent, expandable "How I calculated this" on every number.
- **Comfort guarantee**: "You can undo this at any time."

## The hardest explanation: "the cheap tariff would cost me more?"

This is the counter-intuitive result at the centre of the product, and it is where trust is won or
lost. Explain it in three beats, in this order:

1. **Concede it plainly.** "Yes — on your current pattern it would cost you a bit more."
2. **Give the reason in one sentence about *when*, not *how much*.** "A dynamic tariff charges more
   when everyone else is using power. Your biggest hour is 17:00, which is also the priciest."
3. **Turn it into the opportunity.** "That's not bad news, it's the whole opening: the same tariff
   that penalises 17:00 rewards 03:00 by about 10 Rp./kWh."

Then show the band — do nothing and lose a little, shift what you can and gain — and never quote the
perfect-shifting ceiling as something the customer could reach.

## Accessibility and inclusion

Aim for B1-level language. Short sentences. No acronym without its first-use expansion. Never
assume the customer owns a car, a house, or a smartphone. Never assume the bill is small enough not
to matter — for some customers CHF 180 a year is the whole reason they are talking to you.
