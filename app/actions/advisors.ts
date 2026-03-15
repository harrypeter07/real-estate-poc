"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { advisorSchema, type AdvisorFormValues } from "@/lib/validations/advisor";

export type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function createAdvisor(
  values: AdvisorFormValues
): Promise<ActionResponse> {
  const parsed = advisorSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("advisors").insert({
    name: parsed.data.name,
    code: parsed.data.code,
    phone: parsed.data.phone,
    address: parsed.data.address || null,
    birth_date: parsed.data.birth_date || null,
    commission_face1: parsed.data.commission_face1,
    commission_face2: parsed.data.commission_face2,
    commission_face3: parsed.data.commission_face3,
    commission_face4: parsed.data.commission_face4,
    commission_face5: parsed.data.commission_face5,
    commission_face6: parsed.data.commission_face6,
    notes: parsed.data.notes || null,
    is_active: parsed.data.is_active,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Advisor code already exists" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/advisors");
  return { success: true };
}

export async function updateAdvisor(
  id: string,
  values: AdvisorFormValues
): Promise<ActionResponse> {
  const parsed = advisorSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("advisors")
    .update({
      name: parsed.data.name,
      code: parsed.data.code,
      phone: parsed.data.phone,
      address: parsed.data.address || null,
      birth_date: parsed.data.birth_date || null,
      commission_face1: parsed.data.commission_face1,
      commission_face2: parsed.data.commission_face2,
      commission_face3: parsed.data.commission_face3,
      commission_face4: parsed.data.commission_face4,
      commission_face5: parsed.data.commission_face5,
      commission_face6: parsed.data.commission_face6,
      notes: parsed.data.notes || null,
      is_active: parsed.data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/advisors");
  revalidatePath(`/advisors/${id}`);
  return { success: true };
}

export async function getAdvisors() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("advisors")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAdvisorById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("advisors")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}
