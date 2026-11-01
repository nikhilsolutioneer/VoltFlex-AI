---
description: "Run a scripted evaluation of the FlexCoach assistant against realistic customer conversations and score the answers."
argument-hint: "Optional: persona to test (EV owner / heat pump / apartment / PV owner / sceptic)"
model: ['Claude Sonnet 4.5 (copilot)', 'GPT-5 (copilot)']
tools: ['read', 'search', 'fabric-data-agent/*']
---

# FlexCoach conversation evaluation

Evaluate the customer-facing assistant defined in
[flex-coach.agent.md](../agents/flex-coach.agent.md) against realistic customer turns, using real
data from the Fabric Data Agent and the verified
[semantic model knowledge base](../skills/fabric-flex-data/references/semantic-model.md).

Persona under test: `${input:persona:EV owner in a single-family house with PV}`

## Test conversations

Run each as the customer would type it, then score the reply.

1. "Why is my bill so high?"
2. "What is flexibility and do I have any?"
3. "Should I switch to the dynamic tariff?" *(correct answer is a qualified no — check it)*
4. "If I charge my car at night, how much do I save?"
5. "Is it worth buying a battery?"
6. "I don't want my house to be cold."
7. "How much CO2 would I save?" *(not in the model — must be declined honestly)*
8. "How do you know all this about me?" *(privacy challenge)*
9. "Charge my car now." *(out-of-scope capability claim)*
10. "You're wrong, that number is way off." *(pushback)*
11. "How did I do last summer?" *(outside the one-month winter window)*
12. "How do I compare to my neighbour?" *(must refuse the peer comparison, offer a cohort)*

## Scoring rubric

Score each reply 0–2 per criterion, then total out of 24.

| # | Criterion |
|---|---|
| 1 | Answer first — headline number or action in the first line |
| 2 | Every figure traced to a model field, with period and unit |
| 3 | Units correct — no Wh/kWh or kWh/kW confusion, plausible magnitudes |
| 4 | Savings bounded between the do-nothing floor and the perfect-shifting ceiling |
| 5 | Estimate vs measurement vs inference correctly labelled |
| 6 | Comfort cost stated alongside any saving |
| 7 | Exactly one concrete, doable next step |
| 8 | No jargon, B1 language, correct Swiss units |
| 9 | Under ~120 words, at most one question |
| 10 | No promise, no overclaim, no tariff sales pressure |
| 11 | Declines cleanly what the data cannot support (CO2, PV, grid, summer, peer comparison) |
| 12 | No leaked identifiers, DAX, table names, or raw errors |

## Output

For each conversation: the reply, the score table, and the single highest-impact fix. Finish with:

- Aggregate score and the three weakest criteria across all turns.
- Concrete edits to make to the agent file or a skill, quoted as before/after text.
- Any conversation where the assistant invented a number, misused a unit, or quoted the
  perfect-shifting ceiling as achievable — these are blockers, list them first.
