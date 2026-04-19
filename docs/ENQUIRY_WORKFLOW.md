# Enquiries Workflow

## Routes
- `GET /dashboard/enquiries`
  - Admin view of active enquiries (with filters and table).
  - Uses server actions to fetch initial data, then renders the client UI.

## Main UI Components
- `components/enquiries/enquiries-client.tsx`
  - Table + filters (category, project, active/upgraded).
  - Opens:
    - `EnquiryCreateModal` (New Enquiry)
    - `EnquiryEditModal` (edit existing enquiry)
    - `EnquiryTempCustomersModal` (temporary customers found by phone)
- `components/enquiries/enquiry-create-modal.tsx`
  - Creates a new enquiry and links customer data.
  - If an existing temp customer is found by phone, it reuses/fills customer fields.
- `components/enquiries/enquiry-edit-modal.tsx`
  - Edits an enquiry record (including follow-up date, project, status, plan).
- `components/enquiries/enquiry-temp-customers-modal.tsx`
  - Shows temp customer rows for a given enquiry phone.
  - Lets you “Upgrade to Customer” by calling the upgrade server action.
- `components/enquiries/enquiry-upgrade-modal.tsx`
  - From a specific enquiry row, shows linked customers that were upgraded from that enquiry.

## Server Actions (Data Flow)
- `app/actions/enquiries.ts`
  - `getEnquiryCustomers()`: returns enquiry rows for the enquiries table.
  - `createEnquiryCustomer(values)`
    1. Inserts into `enquiry_customers` (always).
    2. If a matching customer by phone already exists, it reuses/link existing temp info.
    3. Otherwise, it creates a temp `customers` row (`customers.is_active = false`) and links it using `customers.enquiry_temp_id`.
  - `updateEnquiryCustomer(id, values)`: updates an existing enquiry row.
  - `getEnquiryTempCustomersForModal()`: used by the temp customers modal.
  - `upgradeTempCustomerToCustomer({ customerId })`: promotes a temp customer into an active customer.
  - `upgradeEnquiryToCustomer({ enquiryId, customerId })`: links/activates a customer for a specific enquiry.

## Form Fields -> DB Columns (current implementation)
The create/edit form supports these main fields:
- `name` -> `enquiry_customers.name` and also temp `customers.name`
- `phone` -> `enquiry_customers.phone` and also `customers.phone` (lookup key)
- `alternate_phone` -> `enquiry_customers.alternate_phone`
- `address` -> `enquiry_customers.address`
- `birth_date` -> `enquiry_customers.birth_date` (optional)
- `project_id` -> `enquiry_customers.project_id` (optional)
- `category` -> `enquiry_customers.category` (shown as “How did they find us?”)
- `details` -> `enquiry_customers.details`
- `follow_up_date` -> `enquiry_customers.follow_up_date` (optional)
- `enquiry_status` -> `enquiry_customers.enquiry_status`
- `is_active`
  - Active enquiries are those with `enquiry_customers.is_active = true`.
  - “Upgraded/Closed” entries are those with `is_active = false`.

### Additional enquiry fields (UI reference)
- `email_id` -> `enquiry_customers.email_id` (optional)
- `address` -> `enquiry_customers.address` (shown as “City / Location”)
- `property_type` -> `enquiry_customers.property_type`
- `segment` -> `enquiry_customers.segment`
- `budget_min`, `budget_max` -> `enquiry_customers.budget_min`, `enquiry_customers.budget_max`
- `preferred_location` -> `enquiry_customers.preferred_location`
- `bhk_size_requirement` -> `enquiry_customers.bhk_size_requirement`
- `assigned_advisor_id` -> `enquiry_customers.assigned_advisor_id` (controls `customers.advisor_id` on promotion)

## How This Fits the App Workflow
1. Create an enquiry via `/dashboard/enquiries` -> `New Enquiry`.
2. Optionally pick an existing temp customer (auto-detected by phone) and fill customer fields.
3. Track follow-up date + enquiry status while the lead is not upgraded.
4. When the lead is converted, use the upgrade UI to promote the temp customer / link it to the enquiry.
5. Enquiries table automatically reflects “Active” vs “Upgraded/Closed” using `enquiry_customers.is_active`.

## Note About UI vs Screenshot
If you want the enquiry form to include additional fields from the reference screenshots (for example budget/property/segment/email), tell me which exact fields must be added and I will extend:
- `lib/validations/enquiry.ts`
- `enquiry-create-modal.tsx` + `enquiry-edit-modal.tsx`
- `app/actions/enquiries.ts`
- the DB schema (migration + RLS as needed)

