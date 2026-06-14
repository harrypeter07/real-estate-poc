require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function backfill() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('Fetching all sales...');
  const { data: sales, error: salesError } = await supabase
    .from('plot_sales')
    .select('id, total_sale_amount, amount_paid, remaining_amount, is_cancelled');

  if (salesError) {
    console.error('Error fetching sales:', salesError.message);
    process.exit(1);
  }

  console.log(`Found ${sales.length} sales. Fetching all confirmed payments...`);
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('sale_id, amount, is_confirmed');

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError.message);
    process.exit(1);
  }

  // Group confirmed payments by sale_id
  const paymentsBySale = {};
  for (const p of payments) {
    if (p.is_confirmed) {
      paymentsBySale[p.sale_id] = (paymentsBySale[p.sale_id] || 0) + Number(p.amount);
    }
  }

  console.log('Recalculating amount_paid and remaining_amount...');
  let updatedCount = 0;
  for (const sale of sales) {
    // If the sale is cancelled, we still want to keep its amounts calculated or at least not null.
    const actualPaid = paymentsBySale[sale.id] || 0;
    const actualRemaining = Number(sale.total_sale_amount) - actualPaid;

    if (
      sale.amount_paid !== actualPaid ||
      sale.remaining_amount !== actualRemaining
    ) {
      console.log(`Updating sale ${sale.id}: paid ${sale.amount_paid} -> ${actualPaid}, remaining ${sale.remaining_amount} -> ${actualRemaining}`);
      
      const { error: updateError } = await supabase
        .from('plot_sales')
        .update({
          amount_paid: actualPaid,
          remaining_amount: actualRemaining
        })
        .eq('id', sale.id);

      if (updateError) {
        console.error(`Error updating sale ${sale.id}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Backfill complete. Updated ${updatedCount} sales.`);
}

backfill();
