"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCommissions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("advisor_commissions")
    .select(`
      *,
      advisors(name, code),
      plot_sales(
        plots(plot_number, projects(name))
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function recordCommissionPayment(id: string, amount: number) {
  const supabase = await createClient();

  const { data: comm, error: getError } = await supabase
    .from("advisor_commissions")
    .select("amount_paid")
    .eq("id", id)
    .single();

  if (getError) return { success: false, error: getError.message };

  const newAmountPaid = (comm.amount_paid || 0) + amount;

  const { error: updateError } = await supabase
    .from("advisor_commissions")
    .update({ amount_paid: newAmountPaid })
    .eq("id", id);

  if (updateError) return { success: false, error: updateError.message };

  revalidatePath("/commissions");
  return { success: true };
}
