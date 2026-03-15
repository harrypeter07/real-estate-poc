"use server";

import { createClient } from "@/lib/supabase/server";

export async function getReportStats() {
  const supabase = await createClient();

  // 1. Total Sales & Revenue
  const { data: sales } = await supabase
    .from("plot_sales")
    .select("total_sale_amount, amount_paid, remaining_amount, created_at");

  const totalSalesValue = sales?.reduce((sum, s) => sum + Number(s.total_sale_amount), 0) || 0;
  const totalRevenueCollected = sales?.reduce((sum, s) => sum + Number(s.amount_paid), 0) || 0;
  const totalOutstanding = sales?.reduce((sum, s) => sum + Number(s.remaining_amount), 0) || 0;

  // 2. Total Expenses
  const { data: expenses } = await supabase
    .from("office_expenses")
    .select("amount");
  
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  // 3. Advisor Stats
  const { data: advisors } = await supabase
    .from("advisors")
    .select("id, name, advisor_commissions(total_commission_amount, amount_paid)");

  const advisorPerformance = advisors?.map(a => {
    const comms = a.advisor_commissions as any[] || [];
    return {
      name: a.name,
      totalCommission: comms.reduce((sum, c) => sum + Number(c.total_commission_amount), 0),
      paidCommission: comms.reduce((sum, c) => sum + Number(c.amount_paid), 0),
    };
  }) || [];

  // 4. Project Stats
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, plots(status)");

  const projectStats = projects?.map(p => {
    const plots = p.plots as any[] || [];
    return {
      name: p.name,
      total: plots.length,
      sold: plots.filter(pl => pl.status === 'sold' || pl.status === 'agreement').length,
      available: plots.filter(pl => pl.status === 'available').length,
    };
  }) || [];

  return {
    summary: {
      totalSalesValue,
      totalRevenueCollected,
      totalOutstanding,
      totalExpenses,
      netProfit: totalRevenueCollected - totalExpenses
    },
    advisorPerformance,
    projectStats
  };
}
