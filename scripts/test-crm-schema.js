const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

async function verifySchema() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
		process.exit(1);
	}

	const supabase = createClient(url, key);

	console.log("Checking database tables and columns...");

	// 1. Check enquiry_customers new columns
	let cols = null;
	try {
		const res = await supabase.rpc("check_table_columns_exist", { p_table: "enquiry_customers" });
		cols = res.data;
	} catch (e) {
		// RPC failed or doesn't exist
	}

	// Direct query fallback using information_schema or checking tables directly
	const checkTable = async (tableName) => {
		const { data, error } = await supabase.from(tableName).select("*").limit(1);
		if (error && error.code === "PGRST301") {
			// Row level security / permissions issue, table exists
			return { exists: true, error: null };
		} else if (error && error.message.includes("does not exist")) {
			return { exists: false, error };
		}
		return { exists: true, error: null };
	};

	const tables = [
		"enquiry_follow_ups",
		"enquiry_site_visits",
		"emi_schedule",
		"payment_penalties",
		"due_payment_reminders",
	];

	console.log("\nAuditing tables:");
	for (const table of tables) {
		const res = await checkTable(table);
		console.log(`- Table '${table}': ${res.exists ? "✅ EXISTS" : "❌ MISSING"}`);
	}

	console.log("\nAuditing altered tables columns:");
	const { data: enqData, error: enqErr } = await supabase.from("enquiry_customers").select("pipeline_stage, lead_source, lost_reason, site_visit_count").limit(0);
	if (enqErr) {
		console.log(`- enquiry_customers alterations: ❌ FAILED (${enqErr.message})`);
	} else {
		console.log(`- enquiry_customers alterations: ✅ SUCCESS (new columns found)`);
	}

	const { data: plotData, error: plotErr } = await supabase.from("plot_sales").select("discount_amount, discount_approved_by, discount_reason, cancellation_reason, lead_source").limit(0);
	if (plotErr) {
		console.log(`- plot_sales alterations: ❌ FAILED (${plotErr.message})`);
	} else {
		console.log(`- plot_sales alterations: ✅ SUCCESS (new columns found)`);
	}
}

verifySchema();
