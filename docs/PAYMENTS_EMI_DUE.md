## Payments: EMI Due + Testing Date

This app supports EMI tracking using `plot_sales.monthly_emi` + `plot_sales.emi_day`.

### What “EMI due” means (rule)

For a given sale:
- An EMI month is considered **paid** only if the **sum of CONFIRMED payments** (`payments.is_confirmed = true`) whose `payment_date` falls in that calendar month is **≥ `plot_sales.monthly_emi`**.
- If the monthly sum is `< monthly_emi`, that month is treated as **missed**.
- The EMI Due section only lists sales with:
  - `monthly_emi` set,
  - `emi_day` set,
  - `remaining_amount > 0`,
  - and **missed_months > 0**.

### “Collapsed due”

For each EMI sale, the section shows:

\[
collapsed\_due = \min(remaining\_amount,\ missed\_months \times monthly\_emi)
\]

This is a quick “how much is due based on missed EMIs”, capped by the actual remaining balance.

### Cancellation threshold

- If **missed_months ≥ 3**:
  - The row is highlighted in red.
  - The WhatsApp action changes to **“Cancellation reminder”** (template id: `plot_cancellation_reminder`).

### Testing with “As of date”

On the Payments page (`/payments`) there is an **As of date** picker:
- It sets `?asOf=YYYY-MM-DD` in the URL.
- Due calculations use this date instead of the real system date.
- Filters like `from/to/status/mode` preserve `asOf` when you apply/clear them.

Example URLs:
- `/payments?asOf=2026-06-15`
- `/payments?from=2026-01-01&to=2026-12-31&asOf=2026-06-15`

### Collect payment flow

From the EMI Due section:
- **Collect** opens `/sales?openSaleId=<sale_id>&collect=1`
- The sales page auto-opens the sale modal for that `sale_id`
- From there you can use **Collect Payment** (existing flow)

### Key files

- EMI due computation (per-sale, missed-month logic): `app/actions/payment-due.ts`
- Payments page wiring + asOf param: `app/(dashboard)/payments/page.tsx`
- As-of date picker: `components/payments/payments-asof-date.tsx`
- EMI due UI + modal: `components/payments/payments-emi-due-section.tsx`
- Sales deep-link auto-open: `components/sales/sales-list.tsx`
- WhatsApp templates: `lib/payment-message-templates.ts`

