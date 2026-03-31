## Super Admin + Multi-tenant SaaS

This document explains how the app now supports **multiple businesses (tenants)** in a single deployment, controlled by a **Super Admin**.

### Key concepts

- **Tenant / Business**
  - Stored in `public.businesses`.
  - All business data is scoped by `business_id`.

- **Roles**
  - Stored in Supabase Auth `user_metadata.role`.
  - `superadmin`: can manage all tenants and module entitlements.
  - `admin`: belongs to one tenant and uses the main dashboard.
  - `advisor`: belongs to one tenant and uses `/advisor/*`.

- **Module entitlements (real-time)**
  - Stored in `public.business_modules`.
  - Super Admin can toggle modules per business and the UI updates immediately.

- **Audit logs**
  - Stored in `public.superadmin_audit_logs`.
  - Every Super Admin CRUD / module toggle writes a log row.

### Database migrations added

- `supabase/migrations/20260331120000_multitenant_businesses_modules_audit.sql`
  - Creates: `businesses`, `business_admins`, `modules`, `business_modules`, `superadmin_audit_logs`.

- `supabase/migrations/20260331121500_add_business_id_and_backfill.sql`
  - Adds `business_id` to domain tables and backfills existing rows to a **Default Business**.
  - Converts global uniqueness constraints to tenant-safe composite uniques (examples: `(business_id, phone)`).

- `supabase/migrations/20260331123000_multitenant_rls_helpers_and_policies.sql`
  - Adds RLS helper functions (`app_role`, `app_business_id`, etc.) and tenant-scoped policies.

- `supabase/migrations/20260331124000_app_business_id_default_fallback.sql`
  - Compatibility: if a user token has no `business_id`, it falls back to the DB’s `default_business_id`.

- `supabase/migrations/20260331124500_seed_default_business_modules.sql`
  - Seeds `business_modules` for the Default Business.

- `supabase/migrations/20260331125500_allow_advisors_read_business_modules.sql`
  - Allows advisors to SELECT their own `business_modules` (required for real-time entitlement checks).

### How login works with tenants

- **Super Admin**
  - Bootstrap an Auth user with `user_metadata.role = "superadmin"`.
  - Then login at `/login` and you’ll be redirected to `/superadmin`.

  Bootstrap via script (no manual Supabase UI needed):

  1. Set environment variables (or use defaults in the script):
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - optional: `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`
  2. Run:
     - `node scripts/create-superadmin.js`

- **Tenant Admin**
  - Created from Super Admin UI:
    - `/superadmin/admins` → “Create tenant admin”
  - The system creates an auth user with:
    - `user_metadata.role = "admin"`
    - `user_metadata.business_id = <tenant uuid>`

- **Advisor**
  - Advisor auth users are created (when needed) with:
    - `user_metadata.role = "advisor"`
    - `user_metadata.advisor_id = <advisors.id>`
    - `user_metadata.business_id = <advisors.business_id>`

### Modules and mapping

Module keys (stored in `public.modules.key`):

- `projects`: projects/plots/customers/advisors
- `sales`: sales pages and booking flows
- `payments`: payments pages and collect payment flows
- `commissions`: commissions pages
- `expenses`: expenses pages
- `messaging`: messaging pages
- `enquiries`: enquiries pages
- `hr`: HR pages
- `reports`: reports/analytics pages

UI mapping is defined in `components/layout/nav-items.ts` via `moduleKey`.

### Enforcement points

- **UI navigation**: `components/layout/sidebar.tsx`
  - Loads enabled modules from `business_modules` and hides disabled items.

- **Server-side blocking (real time)**: `middleware.ts`
  - For admin/advisor route paths, middleware checks `business_modules` for the current tenant and redirects if the module is disabled.

- **Optional page-level checks**: `lib/auth/require-entitlement.ts`
  - Individual pages/actions may also call `await requireEntitlement(\"reports\")` etc.

### Super Admin UI

- `/superadmin` overview
- `/superadmin/admins` create businesses + tenant admins, enable/disable admins
- `/superadmin/modules` toggle module entitlements per business
- `/superadmin/audit-logs` view log entries

### Operational notes

- **Backfill / default business**
  - Existing single-tenant data is assigned to `Default Business`.
  - Existing users without `business_id` metadata keep working due to `app_business_id()` fallback.
  - Recommended: set correct `business_id` into every admin/advisor auth user metadata going forward.

  - The app also seeds `business_modules` rows for the Default Business so module navigation works immediately.

- **RLS**
  - If you disable a module, the UI hides it and server-side checks can block entry.
  - All rows are still tenant-filtered by `business_id` in RLS policies.

