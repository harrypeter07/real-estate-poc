## Commission (profit-share) logic

This system uses **profit-share** for advisor earnings.

### Definitions

- **selling_price**: `plot_sales.total_sale_amount`
- **base_price_total**: `plots.size_sqft × projects.min_plot_rate`
- **profit**: `max(0, selling_price - base_price_total)`
- **received**: `plot_sales.amount_paid` (sum of **confirmed** payments)
- **ratio**: `min(1, received / selling_price)`
- **advisor_earning_now**: `profit × ratio`

### Example

If:
- selling_price = ₹2000
- plot size = 100 sqft
- min_plot_rate = ₹10/sqft → base_price_total = ₹1000
- profit = ₹1000
- received = ₹1000 → ratio = 0.5

Then:
- advisor_earning_now = ₹500

### Guard rails

- You **cannot pay the advisor** more than `advisor_earning_now` at the moment you record a payout.\n+- As more customer money is received (confirmed), `received` increases, so `advisor_earning_now` increases automatically.\n+
