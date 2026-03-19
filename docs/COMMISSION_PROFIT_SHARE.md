## Commission (advisor face-rate) logic

This system uses **base-rate vs advisor-rate** for advisor earnings.

### Definitions

- **selling_price**: `plot_sales.total_sale_amount`
- **face_rate_per_sqft**: from `advisor_project_commissions` (based on sale phase)
- **max_commission**: `plots.size_sqft × face_rate_per_sqft`
- **received**: `plot_sales.amount_paid` (sum of **confirmed** payments)
- **ratio**: `min(1, received / selling_price)`
- **advisor_earning_now**: `max_commission × ratio`

### Updated model (current)

- **base_rate_per_sqft**: `projects.min_plot_rate`
- **advisor_rate_per_sqft**: from `advisor_project_commissions` (based on sale phase)
- **base_total**: `plots.size_sqft × base_rate_per_sqft`
- **selling_price**: `plots.size_sqft × advisor_rate_per_sqft`
- **profit_total**: `selling_price - base_total`
- **advisor_earning_now**: `profit_total × min(1, received / selling_price)`

### Example

If:
- selling_price = ₹2000
- plot size = 100 sqft
- face_rate_per_sqft = ₹5/sqft → max_commission = ₹500
- received = ₹1000 → ratio = 0.5

Then:
- advisor_earning_now = ₹250

### Guard rails

- You **cannot pay the advisor** more than `advisor_earning_now` at the moment you record a payout.
- As more customer money is received (confirmed), `received` increases, so `advisor_earning_now` increases automatically.
