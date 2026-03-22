"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function HrAttendanceUpload() {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const [loading, setLoading] = useState(false);

	const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setLoading(true);
		try {
			const fd = new FormData();
			fd.append("file", file);
			const res = await fetch("/api/hr/attendance/upload", {
				method: "POST",
				body: fd,
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? "Upload failed");
				return;
			}
			toast.success(`Imported ${data.inserted} rows`, {
				description:
					data.errors?.length > 0 ? `${data.errors.length} row messages in console` : undefined,
			});
			if (data.errors?.length) console.warn(data.errors);
			router.refresh();
		} finally {
			setLoading(false);
			if (e.target) e.target.value = "";
		}
	};

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				accept=".xlsx,.xls,.csv"
				className="hidden"
				onChange={onFile}
			/>
			<Button
				size="sm"
				variant="outline"
				className="gap-2"
				disabled={loading}
				onClick={() => inputRef.current?.click()}
			>
				{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
				Upload Excel
			</Button>
		</>
	);
}
