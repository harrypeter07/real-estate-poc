"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, FileWarning } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	HrAttendanceRecordsView,
	mapPreviewToAttendanceVM,
} from "@/components/hr/hr-attendance-records-view";

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
	dryRun?: boolean;
};

export function HrAttendanceUpload(props?: {
	onComplete?: (result: HrAttendanceUploadResult) => void;
}) {
	const { onComplete } = props ?? {};
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const pendingFileRef = useRef<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [preview, setPreview] = useState<HrAttendanceUploadResult | null>(null);

	const postFile = async (file: File, dryRun: boolean): Promise<HrAttendanceUploadResult | null> => {
		const fd = new FormData();
		fd.append("file", file);
		fd.append("defaultYear", String(new Date().getFullYear()));
		fd.append("dryRun", dryRun ? "1" : "0");
		const res = await fetch("/api/hr/attendance/upload", {
			method: "POST",
			body: fd,
			credentials: "same-origin",
		});
		const data = await res.json();
		if (!res.ok) {
			toast.error(data.error ?? "Upload failed");
			return null;
		}
		return {
			inserted: data.inserted ?? 0,
			parsed: data.parsed ?? 0,
			format: data.format ?? "work-duration",
			errors: Array.isArray(data.errors) ? data.errors : [],
			previewRows: Array.isArray(data.previewRows) ? data.previewRows : [],
			dryRun: Boolean(data.dryRun),
		};
	};

	const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const lower = file.name.toLowerCase();
		const ok =
			lower.endsWith(".csv") ||
			lower.endsWith(".xlsx") ||
			lower.endsWith(".xls") ||
			lower.endsWith(".xlsm");
		if (!ok) {
			toast.error("Use an Excel file (.xlsx / .xls) or a CSV export of the Work Duration report.");
			if (e.target) e.target.value = "";
			return;
		}
		setLoading(true);
		setPreview(null);
		try {
			pendingFileRef.current = file;
			const result = await postFile(file, true);
			if (!result) {
				pendingFileRef.current = null;
				return;
			}
			setPreview(result);
			toast("Preview ready", {
				description: `${result.parsed} rows parsed. Review and confirm import.`,
			});
		} finally {
			setLoading(false);
			if (e.target) e.target.value = "";
		}
	};

	const confirmImport = async () => {
		const file = pendingFileRef.current;
		if (!file) {
			toast.error("Choose the same file again to import.");
			return;
		}
		setLoading(true);
		try {
			const result = await postFile(file, false);
			if (!result) return;
			pendingFileRef.current = null;
			setPreview(null);
			onComplete?.(result);
			toast.success(`Saved ${result.inserted} attendance rows`);
			router.refresh();
		} finally {
			setLoading(false);
		}
	};

	const cancelPreview = () => {
		pendingFileRef.current = null;
		setPreview(null);
	};

	return (
		<div className="space-y-4">
			<input
				ref={inputRef}
				type="file"
				accept=".csv,.xlsx,.xls,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
				className="hidden"
				onChange={onFile}
			/>
			<Button
				size="sm"
				variant="default"
				className="gap-2"
				disabled={loading}
				onClick={() => inputRef.current?.click()}
			>
				{loading && !preview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
				Upload Excel / CSV
			</Button>

			{preview?.dryRun && (
				<div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<FileWarning className="h-4 w-4 text-amber-600" />
						<span className="font-medium">Import preview</span>
						<span className="text-muted-foreground">
							{preview.parsed} parsed row{preview.parsed === 1 ? "" : "s"} — not saved yet
						</span>
					</div>
					{preview.errors.length > 0 && (
						<div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100 max-h-36 overflow-y-auto">
							<p className="font-semibold mb-1">Parser messages</p>
							<ul className="list-disc pl-4 space-y-0.5">
								{preview.errors.slice(0, 50).map((err, i) => (
									<li key={i}>{err}</li>
								))}
							</ul>
						</div>
					)}
					{preview.previewRows.length > 0 && (
						<HrAttendanceRecordsView
							records={mapPreviewToAttendanceVM(preview.previewRows)}
							title="Preview (first 500 rows)"
							showFilters={false}
						/>
					)}
					<div className="flex flex-wrap gap-2">
						<Button size="sm" onClick={confirmImport} disabled={loading || preview.parsed === 0}>
							{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
							Confirm import to database
						</Button>
						<Button size="sm" variant="outline" type="button" onClick={cancelPreview} disabled={loading}>
							Cancel
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
