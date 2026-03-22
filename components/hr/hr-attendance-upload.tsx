"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type HrAttendanceUploadPreviewRow = {
	employee_code: string;
	employee_name?: string;
	work_date: string;
	in_time: string | null;
	out_time: string | null;
	duration_minutes: number | null;
	overtime_minutes: number;
	attendance_type: string;
	is_valid: boolean;
	error?: string;
};

export type HrAttendanceUploadResult = {
	inserted: number;
	parsed: number;
	format: string;
	errors: string[];
	previewRows: HrAttendanceUploadPreviewRow[];
};

export function HrAttendanceUpload(props?: {
	onComplete?: (result: HrAttendanceUploadResult) => void;
}) {
	const { onComplete } = props ?? {};
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
			fd.append("defaultYear", String(new Date().getFullYear()));
			const res = await fetch("/api/hr/attendance/upload", {
				method: "POST",
				body: fd,
				credentials: "same-origin",
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? "Upload failed");
				return;
			}
			const result: HrAttendanceUploadResult = {
				inserted: data.inserted ?? 0,
				parsed: data.parsed ?? 0,
				format: data.format ?? "unknown",
				errors: Array.isArray(data.errors) ? data.errors : [],
				previewRows: Array.isArray(data.previewRows) ? data.previewRows : [],
			};
			onComplete?.(result);
			toast.success(`Imported ${data.inserted} rows`, {
				description:
					result.errors.length > 0
						? `${result.errors.length} message(s) — see details on this page`
						: undefined,
			});
			if (result.errors.length) console.warn(result.errors);
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
