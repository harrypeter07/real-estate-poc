"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
		let cancelled = false;
		try {
			const n = String(localStorage.getItem("app_business_display_name") ?? "").trim();
			const t = String(localStorage.getItem("app_business_tagline") ?? "").trim();
			if (n) setName(n);
			if (t) setTagline(t);
		} catch {
			// ignore
		}

		async function hydrateFromBusinessProfile() {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user || cancelled) return;

			const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
			let businessId = String(meta.business_id ?? "").trim();

			if (!businessId && user.id) {
				const { data: adminMap } = await supabase
					.from("business_admins")
					.select("business_id")
					.eq("auth_user_id", user.id)
					.maybeSingle();
				businessId = String((adminMap as { business_id?: string } | null)?.business_id ?? "").trim();
			}

			if (!businessId && meta.advisor_id) {
				const advisorId = String(meta.advisor_id ?? "").trim();
				if (advisorId) {
					const { data: advisor } = await supabase
						.from("advisors")
						.select("business_id")
						.eq("id", advisorId)
						.maybeSingle();
					businessId = String((advisor as { business_id?: string } | null)?.business_id ?? "").trim();
				}
			}

			if (!businessId || cancelled) return;

			const { data: business } = await supabase
				.from("businesses")
				.select("name, display_name, tagline")
				.eq("id", businessId)
				.maybeSingle();
			if (!business || cancelled) return;

			const nextName = String(
				(business as { display_name?: string | null; name?: string | null }).display_name ??
					(business as { name?: string | null }).name ??
					"",
			).trim();
			const nextTagline = String((business as { tagline?: string | null }).tagline ?? "").trim();

			if (nextName) {
				setName(nextName);
				try {
					localStorage.setItem("app_business_display_name", nextName);
				} catch {
					// ignore
				}
			}
			if (nextTagline) {
				setTagline(nextTagline);
				try {
					localStorage.setItem("app_business_tagline", nextTagline);
				} catch {
					// ignore
				}
			}
		}

		void hydrateFromBusinessProfile();
		return () => {
			cancelled = true;
		};
	}, [fallbackName, fallbackTagline]);

	return (
		<div>
			<p className="text-base font-bold leading-none">{name}</p>
			<p className="text-[11px] text-zinc-400 mt-0.5">{tagline}</p>
		</div>
	);
}

