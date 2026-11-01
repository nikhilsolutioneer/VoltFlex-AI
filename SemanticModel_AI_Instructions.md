# SemanticModel_AI_Instructions

**Target:** Power BI → `Consumption` semantic model → **Prep data for AI** → **Add AI instructions** tab
**Applies to:** `Consumption` (`d07961a2-ae83-4fd7-947d-b829f3bd45ff`)
**Current draft:** ~3,400 characters

---

## Why this file exists

This is the half of the configuration that the DAX generation tool **actually reads**. Per [Semantic model best practices for data agent](https://learn.microsoft.com/en-us/fabric/data-science/semantic-model-best-practices):

> *"When querying semantic models, the DAX generation tool used by data agent relies solely on the semantic model's metadata and Prep for AI configurations."*

Everything model-specific — terminology, measure selection, default groupings, unit handling, caveats — belongs here, not in the data agent pane. The companion file is [DataAgent_Instructions.md](DataAgent_Instructions.md).

**Where to set it:** Power BI Desktop or the Power BI service → **Home** ribbon → **Prep data for AI** → **Add AI instructions**. Requires **Write** permission on the model (Read is only enough for querying).

---

## Paste-ready content

Copy everything between the markers into the **Add AI instructions** text box.

<!-- ─────────── BEGIN PASTE ─────────── -->

### What this model contains

This model holds residential electricity meter readings and electricity tariff prices. Its purpose is to compare what a customer pays on a flat-rate contract against what they would pay on a dynamic, hourly tariff, and to quantify the savings.

### Core business terms

- **Consumption** means electricity used, stored in watt-hours in `Consumption[consumption_Wh]`. Report it in kilowatt-hours (kWh) by dividing by 1,000 unless the user explicitly asks for watt-hours.
- **Standard tariff**, **flat rate**, **fixed price**, and **static price** all mean the same thing: a single unchanging price per kWh. Use the measure `CostStaticPrice`.
- **Dynamic tariff**, **time-of-use tariff**, **hourly pricing**, and **variable price** all mean the same thing: a price that changes through the day. Use the measure `CostByDynamicPrice`.
- **Best case**, **cheapest possible**, **theoretical minimum**, and **optimal** all mean pricing a whole day's consumption at that day's single cheapest hourly price. Use the measure `CostByLowestPrice`.
- **Savings** means the flat-rate bill minus one of the alternative bills. A positive value means the alternative is cheaper.

### Which measure to use

- For "how much electricity was used", use `TotalConsumtion_Wh` and convert to kWh. Note this measure name is misspelled in the model — it is the total consumption measure.
- For "what does it cost today" or "what do they currently pay", use `CostStaticPrice`.
- For "what would it cost on the dynamic tariff", use `CostByDynamicPrice`.
- For "how much could they save", use `SavingsDynamic_Absolute` and `SavingsDynamic_Pct` together. These are the realistic, achievable savings and should be the default answer to any savings question.
- For "what is the maximum possible saving" or "what is the best case", use `SavingsLowest_Absolute` and `SavingsLowest_Pct`. Always label these as theoretical maximums that assume perfect load shifting, not achievable results.
- Never compute costs by multiplying columns directly. Always use the existing measures, which already handle the Wh to kWh conversion.

### Pricing rules

- `FixPricePerWh` is the flat reference rate. Despite its name the value is priced **per kWh**, not per watt-hour. Do not apply any further unit conversion to it.
- All cost measures already divide consumption by 1,000 internally. Do not divide again.
- No currency is declared in the model. Report costs as plain numbers with the word "currency" or the unit shown in `DynamicTarif[Unit]`. Do not assume a currency symbol.

### Dates and time

- Always use the `ConsumptionDate` table for any date filtering, grouping, or trending. Do not use `Consumption[datetime]` or `Consumption[ConsumptionDate]` for grouping — those are hidden join keys.
- Use the `ConsumptionTime` table for time-of-day analysis. `ConsumptionTime[Hour]` is the correct field for load profiles and hourly patterns.
- Sort months using `ConsumptionDate[MonthOfYear]`, never alphabetically by `ConsumptionDate[Month]`.
- Unless the user specifies otherwise, group by day for periods under one month, by month for periods over one month, and by hour for any question about when electricity is used.
- This model is not marked as a date table and time intelligence is disabled. Do not use TOTALYTD, SAMEPERIODLASTYEAR, DATEADD, or similar time intelligence functions. Calculate period comparisons with explicit date filters instead.

### Customers

- Use `Customer[CustomerId]` to identify or filter a customer. Do not use `Consumption[dataset_id]`, which is the hidden join key.
- When no customer filter is given, aggregate across all customers and say so in the answer.

### Defaults and cautions

- When a savings question does not specify a scenario, answer with the dynamic tariff savings, and mention the best-case figure only as additional context.
- `CostByDynamicPrice` matches each reading to a price by exact timestamp. If a reading has no matching price it contributes zero cost. If a dynamic cost looks unexpectedly low relative to consumption, state that the figure may be incomplete rather than presenting it as accurate.
- `DynamicTarif` has no relationship to the consumption data; it is joined inside the measure. Do not attempt to filter or group `DynamicTarif` alongside consumption fields.
- The column `consumption_Wh` is formatted as currency in the model. It is an energy quantity, not money. Never describe it as a cost.

<!-- ─────────── END PASTE ─────────── -->

---

## Recommended companion configuration

The docs describe three Prep for AI components. AI instructions are only one — the other two matter as much:

### 1. AI data schema (`Simplify data schema` tab)

Include only what the agent needs, and include dependent objects:

| Include | Exclude |
|---|---|
| `Consumption` — `datetime`, `consumption_Wh`, all 9 measures | `Consumption[dataset_id]`, `Consumption[ConsumptionDate]`, `Consumption[ConsumptionTime]` (hidden join keys) |
| `ConsumptionDate` — all columns | — |
| `ConsumptionTime` — all columns | — |
| `Customer[CustomerId]` | — |
| `DynamicTarifMinValuePerDay[ConsumptionDate]`, `[LowestTarif]` | `DynamicTarif` (no relationship; used only inside DAX) |

> `FixPricePerWh` and `TotalConsumtion_Wh` are helper measures the docs would normally suggest excluding. **Keep them** — `CostStaticPrice` depends on both, and the docs require dependent objects to be included in the schema.

### 2. Verified answers

Not yet created. Worth adding for the highest-traffic questions, with five to seven trigger phrasings each:

- "How much could customer X save on a dynamic tariff?"
- "What is the hourly consumption profile?"
- "Which customers have the highest savings potential?"
- "How does weekday consumption compare to weekend?"

> Verified answers will not work against hidden fields, which is another reason to slice by the dimension tables rather than the fact table keys.

### 3. Model metadata

Already done — descriptions were added to all tables, columns, and measures and published to Fabric. The docs call this out directly: *"Add descriptions to tables, columns, and measures to help the LLM understand the purpose of each object."*

---

## Known weaknesses these instructions work around

The instructions above paper over four model-level issues. Fixing them at the source would be more reliable than instructing the LLM around them:

| Issue | Worked around by | Better fix |
|---|---|---|
| `TotalConsumtion_Wh` misspelled | Naming it explicitly in the instructions | Rename the measure |
| `FixPricePerWh` is per kWh | An explicit warning | Rename to `FixPricePerKWh` |
| `ConsumptionDate` not marked as a date table | Banning time intelligence functions | Mark it as a date table |
| `consumption_Wh` formatted as currency | Telling the AI it isn't money | Change the format string |

The docs are explicit that naming quality drives accuracy: *"Object names like TR_AMT, F_SLS, or DIM_GEO_01 provide no context for the DAX generation tool."* The same applies to a misspelled measure and a misleading unit in a name.
