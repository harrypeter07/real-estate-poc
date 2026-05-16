"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function DashboardRealtime() {
	const router = useRouter();
	const supabase = createClient();
	const queryClient = useQueryClient();

	useEffect(() => {
		const channel = supabase
			.channel("dashboard-realtime")
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "payments" },
				(payload) => {
					console.log("Realtime payment change:", payload);
					// Invalidate any tanstack queries if they exist
					queryClient.invalidateQueries({ queryKey: ["reportStats"] });
					// Refresh server components
					router.refresh();
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [router, supabase, queryClient]);

	return null;
}
