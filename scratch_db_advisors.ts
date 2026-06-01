import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
	const envPath = path.resolve(__dirname, ".env");
	const content = fs.readFileSync(envPath, "utf-8");
	const env: Record<string, string> = {};
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const idx = trimmed.indexOf("=");
		if (idx === -1) continue;
		const key = trimmed.slice(0, idx).trim();
		let val = trimmed.slice(idx + 1).trim();
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		env[key] = val;
	}
	return env;
}

async function test() {
	const env = loadEnv();
	const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
	
	const { data: advisor, error } = await supabase
		.from("advisors")
		.select("*")
		.limit(1)
		.maybeSingle();
	
	if (error) {
		console.error("Error fetching advisor:", error);
	} else {
		console.log("Advisor columns and sample data:", advisor);
	}
}

test();
