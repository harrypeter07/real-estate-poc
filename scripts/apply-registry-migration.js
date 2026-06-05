require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function applyMigration() {
	const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const dbPassword = process.env.DB_PASSWORD;

	if (!supabaseUrl) {
		console.error("Error: Please provide NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in your .env file.");
		process.exit(1);
	}

	if (!dbPassword) {
		console.error("\nError: DB_PASSWORD is not set in your .env file.");
		process.exit(1);
	}

	const projectRef = supabaseUrl.split("://")[1].split(".")[0];

	const strategies = [
		{
			name: "User-provided Pooler (ap-south-1 aws-1)",
			host: "aws-1-ap-south-1.pooler.supabase.com",
			port: 6543,
			user: `postgres.${projectRef}`,
		},
		{
			name: "Direct Connection (IPv6)",
			host: `db.${projectRef}.supabase.co`,
			port: 5432,
			user: "postgres",
		},
		{
			name: "Pooler ap-south-1 (aws-0)",
			host: "aws-0-ap-south-1.pooler.supabase.com",
			port: 6543,
			user: `postgres.${projectRef}`,
		},
	];

	let client;
	let connected = false;

	for (const strategy of strategies) {
		console.log(`Attempting connection: ${strategy.name}...`);
		client = new Client({
			host: strategy.host,
			port: strategy.port,
			user: strategy.user,
			password: dbPassword,
			database: "postgres",
			ssl: { rejectUnauthorized: false },
			connectionTimeoutMillis: 5000,
		});

		try {
			await client.connect();
			connected = true;
			console.log(`Connected successfully via ${strategy.name}!`);
			break;
		} catch (err) {
			console.warn(`${strategy.name} failed: ${err.message}`);
			await client.end();
		}
	}

	if (!connected) {
		console.error("\nCould not connect to the database.");
		process.exit(1);
	}

	try {
		const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "20260605130000_add_registry_and_sub_advisor_commissions.sql");
		console.log(`Reading migration from ${migrationPath}...`);
		const sql = fs.readFileSync(migrationPath, "utf8");

		console.log("Executing registry and sub-advisor commission migration...");
		await client.query(sql);
		console.log("Migration executed successfully!");
	} catch (err) {
		console.error("Error executing migration:", err.message);
	} finally {
		await client.end();
	}
}

applyMigration();
