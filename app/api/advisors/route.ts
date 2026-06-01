import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
	buildAdvisorPasswordFromNameAndPhone,
	generateRandomAdvisorPassword,
	formatNotesWithPassword,
} from "@/lib/auth/advisor-password";

function generateAdvisorCode(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let code = "ADV-";
	for (let i = 0; i < 4; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}

function toAdvisorEmail(phone: string): string {
	const sanitized = phone.replace(/\D/g, "").slice(-10) || "0";
	return `adv_${sanitized}@mginfra.local`;
}

export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const {
			name,
			phone,
			email,
			address,
			birth_date,
			parent_advisor_id,
			commission_token,
			commission_agreement,
			commission_registry,
			commission_full_payment,
			notes,
			business_id,
		} = body;

		// Validation
		if (!name || !phone || !business_id) {
			return NextResponse.json(
				{ error: "name, phone, and business_id are required" },
				{ status: 400 }
			);
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Check phone uniqueness within same business_id
		const { data: existingPhone } = await supabase
			.from("advisors")
			.select("id")
			.eq("business_id", business_id)
			.eq("phone", phone)
			.maybeSingle();

		if (existingPhone) {
			return NextResponse.json(
				{ error: "Phone number already registered for this business" },
				{ status: 409 }
			);
		}

		// Auto-generate unique advisor code: "ADV-" + 4 random uppercase chars
		let code = generateAdvisorCode();
		let isUnique = false;
		let attempts = 0;
		while (!isUnique && attempts < 10) {
			const { data: existingCode } = await supabase
				.from("advisors")
				.select("id")
				.eq("business_id", business_id)
				.eq("code", code)
				.maybeSingle();
			if (!existingCode) {
				isUnique = true;
			} else {
				code = generateAdvisorCode();
				attempts++;
			}
		}

		// Insert advisor record
		const rawPassword = generateRandomAdvisorPassword(name);
		const password = rawPassword.length >= 6 ? rawPassword : rawPassword.padEnd(6, "0");
		const finalNotes = formatNotesWithPassword(notes, password);

		const advisorEmail = email?.trim() || toAdvisorEmail(phone);
		const { data: advisor, error: insertError } = await supabase
			.from("advisors")
			.insert({
				business_id,
				parent_advisor_id: parent_advisor_id || null,
				name,
				code,
				phone,
				email: advisorEmail,
				address: address || null,
				birth_date: birth_date || null,
				notes: finalNotes || null,
				commission_token: commission_token ? Number(commission_token) : 0,
				commission_agreement: commission_agreement ? Number(commission_agreement) : 0,
				commission_registry: commission_registry ? Number(commission_registry) : 0,
				commission_full_payment: commission_full_payment ? Number(commission_full_payment) : 0,
				is_active: true,
			})
			.select("*")
			.single();

		if (insertError) {
			return NextResponse.json({ error: insertError.message }, { status: 400 });
		}

		// Hashing and storing auth credentials
		const admin = createAdminClient();
		if (admin && advisor) {
			const pw = password;
			const { data: authUser, error: authError } = await admin.auth.admin.createUser({
				email: advisorEmail,
				password: pw,
				email_confirm: true,
				user_metadata: {
					role: "advisor",
					advisor_id: advisor.id,
					business_id,
					parent_advisor_id: parent_advisor_id || null,
				},
			});

			if (!authError && authUser?.user) {
				const { error: updateError } = await supabase
					.from("advisors")
					.update({ auth_user_id: authUser.user.id })
					.eq("id", advisor.id);
				if (!updateError) {
					advisor.auth_user_id = authUser.user.id;
				}
			}
		}

		return NextResponse.json(advisor, { status: 201 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
