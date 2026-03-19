"use client";

import { useEffect, useState } from "react";
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
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadSignedUrl() {
      if (!receiptPath) {
        setUrl("");
        setFilename("");
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(receiptPath, 60 * 60);

        // Debug to verify we're using the correct bucket/path
        console.debug("[ReceiptViewer] signedUrl", {
          bucket,
          receiptPath,
          hasSignedUrl: !!data?.signedUrl,
          error: error?.message ?? null,
        });

        if (!mounted) return;
        if (error || !data?.signedUrl) {
          setUrl("");
          setFilename(receiptPath.split("/").pop() || "receipt");
          return;
        }

        setUrl(data.signedUrl);
        setFilename(receiptPath.split("/").pop() || "receipt");
      } catch (e) {
        if (!mounted) return;
        console.debug("[ReceiptViewer] signedUrl exception", e);
        setUrl("");
        setFilename(receiptPath.split("/").pop() || "receipt");
      }
    }

    loadSignedUrl();
    return () => {
      mounted = false;
    };
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

