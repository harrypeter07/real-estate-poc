import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Manish Group CRM",
		short_name: "MG CRM",
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
