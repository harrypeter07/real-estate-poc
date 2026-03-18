"use client";

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function ReceiptViewButton({
  receiptPath,
  title = "Receipt",
  bucket = "receipts",
  variant = "ghost",
}: {
  receiptPath?: string | null;
  title?: string;
  bucket?: string;
  variant?: "ghost" | "outline" | "default";
}) {
  const [open, setOpen] = useState(false);

  const url = useMemo(() => {
    if (!receiptPath) return "";
    const supabase = createClient();
    return supabase.storage.from(bucket).getPublicUrl(receiptPath).data.publicUrl;
  }, [bucket, receiptPath]);

  if (!receiptPath) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant={variant}
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        title="View receipt"
      >
        <Receipt className="h-4 w-4" />
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Receipt"
            className="w-full rounded-md border border-zinc-200"
          />
        ) : (
          <div className="text-sm text-zinc-500">Receipt not available.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

