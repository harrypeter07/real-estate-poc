# Testing EMI due, collapsed due, and “As of date”

This guide walks through manual QA for the **Payments → EMI due** behaviour: **one missed EMI month** vs **three or more missed months**, using the **As of date** control instead of changing your system clock.

For a shorter reference on rules and file locations, see [PAYMENTS_EMI_DUE.md](PAYMENTS_EMI_DUE.md).

## Prerequisites

- A **plot sale** (`plot_sales`) with:
  - `remaining_amount` **> 0**
  - `monthly_emi` set (number > 0)
  - `emi_day` set (1–31)
  - Valid **`token_date` or `agreement_date`** (used as the EMI schedule anchor)
  - Sale **not** cancelled (`is_cancelled = false`)
- Optional but useful: **no or partial confirmed payments** in the calendar months you want to treat as “missed.”

Only **confirmed** payments count: `payments.is_confirmed = true`. Sums are grouped by **`payment_date` calendar month** (YYYY-MM).

## Where to test in the UI

1. Open **Payments**: `/payments`
2. Set **Status** to **Pending** (full due table), or use the URL directly:
   - `/payments?status=pending`
3. Use **As of date** (or add to the URL):
   - `/payments?status=pending&asOf=2026-06-15`

The picker updates `?asOf=YYYY-MM-DD`. All EMI due math for that page uses **asOf** as “today” instead of the real date.

## What to look for

| Concept | Meaning |
|--------|---------|
| **Missed month** | An EMI month whose **due date ≤ asOf** and the **sum of confirmed payments in that calendar month** is **&lt; monthly_emi**. |
| **Missed months count** | Count of such months in the schedule built up to `asOf`. Rows appear only when **missed months &gt; 0**. |
| **Collapsed due** | `min(remaining_amount, missed_months × monthly_emi)` — a quick “stacked” due amount capped by remaining balance. |
| **≥ 3 missed months** | Row styling turns **red**; WhatsApp action uses the **cancellation reminder** template instead of the normal remind flow. |

## Scenario A — Exactly one missed month (normal reminder, not “cancellation” tier)

Goal: **missed_months = 1**, collapsed due = `min(remaining, 1 × monthly_emi)`.

1. Pick a sale with EMI configured and **remaining_amount** high enough (e.g. ≥ 2× `monthly_emi`) so caps do not hide the pattern.
2. Ensure **only the first** EMI month (after the anchor logic) is unpaid: either no payments in that month, or confirmed payments in that month sum to **&lt; monthly_emi**.
3. Later months can be paid or not; **only one** unpaid month should have **due date ≤ asOf**.
4. Set **As of date** to a day **after** that single due date but **before** the next EMI due date would force a second missed month.
5. Open `/payments?status=pending&asOf=...`.

**Expect:**

- Row appears with **Missed months = 1**
- **Collapsed due** equals **one** EMI (or `remaining_amount` if lower)
- **Remind** uses the normal (non-cancellation) template — row is **not** in the heavy “3+ months” red treatment

## Scenario B — Three or more missed months (red row + cancellation reminder)

Goal: **missed_months ≥ 3**, collapsed due = `min(remaining, missed × monthly_emi)`.

1. Use the same sale shape as above, but leave **at least three** consecutive EMI months (each with due ≤ asOf) **under-paid**: confirmed monthly sums **&lt; monthly_emi**.
2. Set **As of date** to **after** the third missed due date.
3. Open `/payments?status=pending&asOf=...`.

**Expect:**

- **Missed months ≥ 3**
- **Collapsed due** reflects **missed_months × monthly_emi** (still capped by `remaining_amount`)
- **Red** highlighting on the row / key cells (severe delinquency)
- WhatsApp shows **Cancellation reminder** (template `plot_cancellation_reminder` in code — see `lib/payment-message-templates.ts`)

## Scenario C — “Date collapse” sanity check

Collapsed due is **not** “remaining balance” unless missed months × EMI exceeds it:

1. Set **remaining_amount** only slightly above **monthly_emi** (e.g. one EMI left) but force **two** missed months with **asOf**.
2. **Collapsed due** should cap at **remaining_amount**, not `2 × monthly_emi`, if that product is higher.

## Quick URL recipes

- Pending due table, simulated date:

  `https://<your-host>/payments?status=pending&asOf=2026-08-01`

- Same with search (if you use search on that page): keep `asOf` when changing filters so the simulation stays consistent.

## Troubleshooting

- **No rows:** Check `remaining_amount`, `monthly_emi`, `emi_day`, anchor date, and that **asOf** is **after** at least one EMI due that is still “unpaid” by the rules above.
- **Wrong month count:** Remember payments are grouped by **calendar month of `payment_date`**, not by EMI due date month — a payment on the last day of a month counts in **that** month’s bucket.
- **RLS errors creating projects:** New `projects` / `plots` rows must include **`business_id`** matching the tenant; the app sets this from the signed-in business context. If you still see RLS errors, confirm your user has `user_metadata.business_id` (or default business in `_app_kv` per migrations) and that migrations through `20260331124000_app_business_id_default_fallback.sql` are applied.
