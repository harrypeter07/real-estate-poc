"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import { Button, Input, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { compressImageToTarget } from "@/lib/utils/image";

export function BusinessLogoUpload({
	businessId,
	value,
	onChange,
}: {
	businessId: string;
	value: string | null | undefined;
	onChange: (path: string | null) => void;
}) {
	const [uploading, setUploading] = useState(false);

	const publicUrl = useMemo(() => {
		if (!value) return "";
		const supabase = createClient();
		return supabase.storage.from("receipts").getPublicUrl(value).data.publicUrl;
	}, [value]);

	async function handleFile(file: File | null) {
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file");
			return;
		}
		setUploading(true);
		try {
			const compressed = await compressImageToTarget(file, {
				maxBytes: 90 * 1024,
				maxWidth: 600,
				maxHeight: 600,
				mimeType: "image/jpeg",
			});
			const supabase = createClient();
			const path = `business-logos/${businessId}/${Date.now()}.jpg`;
			const { error } = await supabase.storage.from("receipts").upload(path, compressed, {
				contentType: "image/jpeg",
				upsert: true,
			});
			if (error) throw error;
			onChange(path);
			toast.success("Logo uploaded");
		} catch (e: any) {
			toast.error("Upload failed", { description: e?.message || String(e) });
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-zinc-800">Business logo (optional)</span>
				<Badge variant="secondary" className="text-[10px]">
					{value ? "Attached" : "Optional"}
				</Badge>
			</div>

			<div className="flex items-center gap-2">
				<Input
					type="file"
					accept="image/*"
					disabled={uploading}
					onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
				/>
				{value ? (
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="shrink-0"
						onClick={() => onChange(null)}
						disabled={uploading}
						title="Remove logo"
					>
						<X className="h-4 w-4" />
					</Button>
				) : (
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="shrink-0"
						disabled
						title="No logo attached"
					>
						<Upload className="h-4 w-4" />
					</Button>
				)}
			</div>

			{value && publicUrl ? (
				<div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
					<img
						src={publicUrl}
						alt="Business logo"
						className="h-14 w-14 rounded-md border border-zinc-200 object-contain bg-white"
					/>
					<div className="min-w-0">
						<div className="text-xs font-semibold text-zinc-700">Uploaded logo</div>
						<div className="text-[11px] text-zinc-500">
							This logo will be printed on receipts.
						</div>
						<a
							href={publicUrl}
							target="_blank"
							rel="noreferrer"
							className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900"
						>
							<ImageIcon className="h-3.5 w-3.5" />
							Open full image
						</a>
					</div>
				</div>
			) : null}

			{/* Inline preview above; keep link there only */}

			{uploading ? <div className="text-xs text-zinc-500">Uploading…</div> : null}
		</div>
	);
}

