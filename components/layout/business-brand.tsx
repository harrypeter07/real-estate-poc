"use client";

import { useEffect, useState } from "react";

export function BusinessBrand({
	fallbackName = "Business name not set",
	fallbackTagline = "",
}: {
	fallbackName?: string;
	fallbackTagline?: string;
}) {
	const [name, setName] = useState(fallbackName);
	const [tagline, setTagline] = useState(fallbackTagline);

	useEffect(() => {
		try {
			const n = String(localStorage.getItem("app_business_display_name") ?? "").trim();
			const t = String(localStorage.getItem("app_business_tagline") ?? "").trim();
			if (n) setName(n);
			if (t) setTagline(t);
		} catch {
			// ignore
		}
	}, [fallbackName, fallbackTagline]);

	return (
		<div>
			<p className="text-base font-bold leading-none">{name}</p>
			<p className="text-[11px] text-zinc-400 mt-0.5">{tagline}</p>
		</div>
	);
}

