# MG Infra CRM (Estate Management + CRM)

This is a **Next.js App Router + Supabase** CRM for managing:
- Projects & plots
- Customers & advisors
- Sales/bookings and payment collections
- Advisor commissions (project-wise)
- Reminders (CRM follow-ups + birthdays + due reminders)

It supports **two roles**:
- **Admin**: full access
- **Advisor**: standalone CRM portal limited to their data

---

## 1) Roles & Login

### Admin login
- Uses Supabase Auth email/password.
- Route: `/login` � Admin tab � redirects to `/dashboard`.

### Advisor login (phone + password)
- Advisors login from `/login` � Advisor tab.
- Advisors are created by Admin from `/advisors`.
- **Default password** is **advisor phone number** (admin can set a custom password at creation time).

**Important env**
Create advisor auth users requires:

```
SUPABASE_SERVICE_ROLE_KEY=...
```

Without it, advisors can still be created in DB, but **their Auth user wont be created automatically**, so advisor login will fail until configured.

---

## 2) Navigation & Route Groups

### Admin app
All existing routes are preserved:
- `/dashboard`
- `/projects`, `/projects/[id]`, `/projects/[id]/plots/...`
- `/advisors`, `/advisors/[id]`, `/advisors/analytics`
- `/customers`
- `/sales`
- `/payments`
- `/commissions`
- `/reminders`

### Advisor standalone portal
Advisors are constrained to the `/advisor` route group:
- `/advisor` (dashboard)
- `/advisor/customers`
- `/advisor/sales`
- `/advisor/payments`
- `/advisor/reminders`

Middleware redirects advisors away from admin routes.

---

## 3) Core Data Model (Supabase)

### Key tables
- `projects` � land projects
- `plots` � plots under each project
- `customers` � buyers/leads (linked to `advisors` via `advisor_id`)
- `advisors` � channel partners (includes `email`, `auth_user_id`)
- `plot_sales` � booking/sale (plot + customer + advisor)
- `payments` � installment collections (kaccha/pakka)
- `advisor_commissions` � commission ledger per sale
- `advisor_project_commissions` � **project-wise Face rates** per advisor
- `reminders` � reminder tasks

### Commission configuration model (IMPORTANT)
Commission is **not stored on the advisor** as face %.

Instead, commission is configured **per project** when assigning advisor:
- Project � Advisor Assignment & Face Rates � Manage � set:
  - Face 1 rate (�/sqft)
  - Face 2 rate (�/sqft)
  - Face 3 rate (�/sqft)
  - Face 4 rate (�/sqft)

---

## 4) Commission Calculation (current)

When a sale is created:
1. System checks advisor is assigned to that project in `advisor_project_commissions`
2. Gets the Face rate (�/sqft) based on `sale_phase` (token/agreement/registry/full_payment)
3. Commission amount is computed as:

\[
\text{commission} = \text{plot.size_sqft} \times \text{face_rate}
\]

Commission is written to `advisor_commissions`.

---

## 5) UX patterns

### Admin advisors
- `/advisors` is now table-driven with:
  - View modal
  - Create modal
  - Edit modal

### Project-wise rate management
- `/projects/[id]` � Advisor Assignment & Face Rates opens a modal for assignment & rates.

### Sales details
- `/sales` uses clickable cards and opens **Sale Detail modal** (avoids `/sales/[id]` route).

---

## 6) Reminders

- `/reminders` shows tasks + includes Birthdays Today section.
- Templates can be selected from Change Templates modal.
- WhatsApp message uses the selected template with placeholders.

Advisor reminders (`/advisor/reminders`) are filtered to the advisors customers.

---

## 7) Required DB Migration (to avoid runtime errors)

If you see errors like:
> Could not find the 'email' column of 'advisors' in the schema cache

Run the migration:
- `supabase/migrations/20250316000001_fix_schema_mismatches.sql`

Then, in Supabase:
- Wait a minute for schema cache refresh, OR
- Restart the API (if needed)

---

## 8) Dev scripts

```
npm install
npm run dev
```

---

## 9) Recent Features

- **Customer advisor "Not assigned"**: When no advisor selected, shows "Not assigned" on cards.
- **Admin direct sell**: Sale form "Sold By" → Admin (Direct); uses plot min rate, no commission.
- **EMI & Follow-up**: Sale form supports EMI months (auto-fills monthly EMI), follow-up date (creates reminder).
- **EMI Modal**: Payments page "EMI" button → list of EMI sales, next due, Remind via WhatsApp.
- **Reminders "EMI Pending Today"**: Badge on installment-due reminders when date is today.
- **Receipt generation**: Post-sale Share Receipt modal; generate HTML receipt, share via WhatsApp.
- **Share Receipt (payments)**: Payment detail panel has Share Receipt button when receipt exists.
- **Dashboard / Reports swap**: Dashboard = full analytics; Reports = project selector + project-specific analytics.
- **Sold by Admin/Advisor**: Reports Top Advisors shows "Admin (Direct)" for admin sales.

See [docs/FEATURES.md](docs/FEATURES.md) for full UI, API, forms, modals, and edge cases.

