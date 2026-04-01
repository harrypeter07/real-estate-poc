"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { CalendarClock, X } from "lucide-react";

export function PaymentsAsOfDate() {
	const router = useRouter();
	const sp = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const asOf = sp.get("asOf") ?? "";
	const [value, setValue] = useState(asOf);

	useEffect(() => {
		setValue(asOf);
	}, [asOf]);

	function setParam(next: string) {
		const params = new URLSearchParams(sp.toString());
		if (next) params.set("asOf", next);
		else params.delete("asOf");
		startTransition(() => {
			const qs = params.toString();
			router.push(qs ? `/payments?${qs}` : "/payments");
		});
	}

	return (
		<div className="flex flex-col sm:flex-row sm:items-center gap-2">
			<div className="flex items-center gap-2 text-sm font-medium text-zinc-600">
				<CalendarClock className="h-4 w-4" />
				<span>As of date</span>
			</div>
			<div className="flex items-center gap-2">
				<Input
					type="date"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					className="h-9 w-[170px]"
				/>
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="h-9"
					disabled={isPending}
					onClick={() => setParam(value)}
				>
					Apply
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="h-9 px-2"
					disabled={isPending || !asOf}
					onClick={() => setParam("")}
					title="Clear as-of date"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

