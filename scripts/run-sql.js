require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function runSql() {
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
		const sqlFile = process.argv[2];
		if (!sqlFile) {
			console.error("Please provide an SQL file path as an argument.");
			process.exit(1);
		}
		const migrationPath = path.resolve(sqlFile);
		console.log(`Reading SQL from ${migrationPath}...`);
		const sql = fs.readFileSync(migrationPath, "utf8");

		console.log("Executing SQL statement...");
		await client.query(sql);
		console.log("Executed successfully!");
	} catch (err) {
		console.error("Error executing SQL:", err.message);
	} finally {
		await client.end();
	}
}

runSql();
