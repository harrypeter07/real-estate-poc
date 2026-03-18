"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function ReceiptViewer({
  receiptPath,
  title = "Receipt",
  bucket = "receipts",
}: {
  receiptPath?: string | null;
  title?: string;
  bucket?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const { url, filename } = useMemo(() => {
    if (!receiptPath) return { url: "", filename: "" };
    const supabase = createClient();
    const publicUrl = supabase.storage.from(bucket).getPublicUrl(receiptPath).data
      .publicUrl;
    const name = receiptPath.split("/").pop() || "receipt";
    return { url: publicUrl, filename: name };
  }, [bucket, receiptPath]);

  async function handleDownload() {
    if (!url || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || "receipt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDownloading(false);
    }
  }

  if (!receiptPath) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
        No receipt image attached.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900">{title}</div>
          <div className="text-[11px] text-zinc-500 truncate">
            Stored at: <span className="font-mono">{bucket}/{receiptPath}</span>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">
          Image
        </Badge>
      </div>

      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={title}
            className="w-full rounded-md border border-zinc-200"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Downloading…" : "Download"}
            </Button>
          </div>
        </>
      ) : (
        <div className="text-sm text-zinc-500">Receipt not available.</div>
      )}
    </div>
  );
}

