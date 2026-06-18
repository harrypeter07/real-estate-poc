import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
	let businessName = "CRM";
	let businessShortName = "CRM";
	try {
		const businessId = await getCurrentBusinessId();
		if (businessId) {
			const supabase = await createClient();
			if (supabase) {
				const { data } = await supabase
					.from("businesses")
					.select("display_name, name")
					.eq("id", businessId)
					.maybeSingle();
				if (data) {
					const name = data.display_name || data.name || "";
					if (name) {
						businessName = `${name} CRM`;
						businessShortName = name;
					}
				}
			}
		}
	} catch (e) {
		console.error("Error retrieving business name for manifest:", e);
	}

	return {
		name: businessName,
		short_name: businessShortName,
		description: "CRM system for real estate plot management, advisor commissions, and customer follow-ups.",
		start_url: "/",
		display: "standalone",
		background_color: "#0f172a",
		theme_color: "#0f172a",
		icons: [
			{
				src: "/icon-192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/icon-512.png",
				sizes: "512x512",
				type: "image/png",
			},
		],
	};
}

