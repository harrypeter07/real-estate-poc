# MG Infra CRM - Features Documentation

## UI Pages & Routes

### Admin Routes

| Route | Description |
|-------|-------------|
| `/dashboard` | Full business analytics: Total Sales, Revenue, Expenses, Net Profit, Enquiry Conversions, Collections vs Outstanding, Project Inventory, Advisor Commissions, Revenue by Project/Phase, Top Advisors, Expense by Category, Sales Trend. Date filters apply. |
| `/reports` | Project-specific analytics: Select a project to see plots (sold/available), revenue, advisors, top plots. When no project selected: overview stats, Upcoming Reminders, Quick Actions. |
| `/projects` | List projects, create/edit. Click project for detail and plot layout. |
| `/projects/[id]` | Project detail: plot grid, advisor assignments, face rates. |
| `/advisors` | List advisors, create/edit. |
| `/advisors/analytics` | Advisor performance, commissions, sales. |
| `/customers` | Customer cards. Click card → detail. Advisor shows "Not assigned" when none. |
| `/enquiries` | Enquiry management. |
| `/sales` | Sales list with filters. Click row → Sale Detail modal. |
| `/sales/new` | New sale form. Supports Advisor or Admin (Direct) sell. EMI months, follow-up date. |
| `/payments` | Payments table. EMI button (top corner) → EMI modal. Click row → detail with Share Receipt. |
| `/commissions` | Commission ledger. |
| `/expenses` | Office expenses. |
| `/reminders` | Reminders with type/date filters. "EMI Pending Today" badge for installment-due reminders. |

### Advisor Routes (`/advisor/*`)

- `/advisor` – Advisor dashboard
- `/advisor/customers` – Advisor's customers
- `/advisor/sales` – Advisor's sales
- `/advisor/payments` – Advisor's payments
- `/advisor/commissions` – Advisor's commissions
- `/advisor/reminders` – Advisor's reminders

---

## API Routes / Server Actions

### Sales (`app/actions/sales.ts`)

- `createSale(values)` – Creates sale, optionally creates follow-up reminder, returns `{ success, error?, saleId? }`
- `getSales()` – All sales with plot, customer, advisor
- `getSaleById(id)` – Single sale detail
- `getCustomerPlotSales(customerId)` – Sales for a customer (advisor-filtered)

### Customers (`app/actions/customers.ts`)

- `createCustomer(values)` – `advisor_id` optional (null = "Not assigned")
- `updateCustomer(id, values)` – Same
- `getCustomers()` – With advisor join

### EMI (`app/actions/emi.ts`)

- `getEmiSales()` – Sales with `monthly_emi` and `remaining_amount > 0`, includes next EMI due date

### Receipts (`app/actions/receipts.ts`)

- `generateReceipt(saleId)` – Generates HTML receipt, uploads to storage, updates `plot_sales.receipt_path`, returns URL
- `getReceiptUrl(saleId)` – Returns public URL for sale receipt
- `getReceiptUrlByPath(path)` – Returns public URL for a receipt path

### Reports (`app/actions/reports.ts`)

- `getReportStats(filters)` – Full business report stats (date-filtered)
- `getProjectAnalytics(projectId)` – Project-specific: plots, revenue, advisors, top plots

### Reminders (`app/actions/reminders.ts`)

- `createReminder(values)` – Supports `sale_id` for EMI linkage
- `getReminders()` – Includes `plot_sales` join for EMI data

---

## Forms & Modals

### Sale Form

- **Sold By**: Advisor | Admin (Direct). Admin hides advisor dropdown, uses plot min rate, no commission.
- **EMI Months**: When remaining > 0, enter months to auto-calculate `monthly_emi`.
- **Follow-up Date**: When remaining > 0, creates reminder for that date.
- **Submit** → Success opens Share Receipt modal (generate → share via WhatsApp).

### Share Receipt Modal (post-sale)

- **Generate Receipt** – Creates HTML bill, uploads, returns link
- **Share via WhatsApp** – Opens customer WhatsApp with receipt link
- **Done** – Closes and navigates to /sales

### EMI Modal (Payments page)

- Lists EMI sales with customer, plot, project, advisor/admin, amounts, next due.
- **EMI Pending Today** badge when due date is today.
- Click row → expand with full EMI details.
- **Remind** button → WhatsApp with pre-filled EMI message.

### Customer Form

- **Referred By (Advisor)**: Select "None" for not assigned. Displays "Not assigned" on card when null.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No advisor for customer | "None" in form; "Not assigned" on card |
| Admin direct sell | Advisor dropdown hidden; min rate used; no commission created |
| Sale with remaining + follow-up date | Reminder auto-created with `type: installment_due`, `sale_id` set |
| EMI months entered | `monthly_emi` auto-computed as `ceil(remaining / months)` |
| EMI due today | Reminder shows "EMI Pending Today"; EMI modal shows badge |
| Share receipt (payment) | Uses `plot_sales.receipt_path` or `payment.receipt_path`; fetches public URL |
| Reports project selector | "All projects" = overview; selecting project = project-specific analytics |
| Dashboard filters | ReportsFilters use `basePath="/dashboard"` for date range |

---

## Clickable & Responsive Elements

- **Customer cards** – Click → `/customers/[id]`
- **Sales table rows** – Click → Sale Detail modal
- **Payments table rows** – Click → Payment detail modal with Share Receipt
- **EMI button** (Payments) – Opens EMI modal
- **Reminders** – WhatsApp button, Mark Complete, Edit, Delete
- **Project selector** (Reports) – Dropdown → filters by project
- **Date filters** (Dashboard) – All time, This month, This year, Last month, custom range
- **Quick Actions** (Reports overview) – Links to New Sale, Collect Payment, Add Customer, Add Expense
- **Modals** – Scrollable content, responsive layout

---

## Database Migration

Run `supabase/migrations/20250320000009_emi_admin_receipt.sql` for:

- `plot_sales.advisor_id` nullable
- `plot_sales.sold_by_admin`, `followup_date`, `receipt_path`
- `reminders.sale_id`
- Index on `reminders(sale_id)`

Ensure the **receipts** bucket exists in Supabase Storage (create manually if needed; set `public=true` for share links).
