"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from "@/components/ui";
import { SaleForm } from "@/components/sales/sale-form";
import { getCustomers } from "@/app/actions/customers";
import { getAdvisors } from "@/app/actions/advisors";

export function SaleBookingDialog({
  open,
  onOpenChange,
  projectName,
  plot,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectId: string;
  plot: {
    id: string;
    plot_number: string;
    size_sqft: number;
    rate_per_sqft: number;
    status: string;
    facing: string | null;
  };
}) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [advisors, setAdvisorsState] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getCustomers(), getAdvisors()])
      .then(([c, a]) => {
        if (cancelled) return;
        setCustomers(c as any[]);
        setAdvisorsState(a as any[]);
      })
      .catch((e: any) => {
        toast.error("Failed to load customers/advisors", {
          description: e?.message || String(e),
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const plotsForForm = useMemo(() => {
    return [
      {
        id: plot.id,
        plot_number: plot.plot_number,
        size_sqft: Number(plot.size_sqft ?? 0),
        rate_per_sqft: Number(plot.rate_per_sqft ?? 0),
        total_amount: Number(plot.size_sqft ?? 0) * Number(plot.rate_per_sqft ?? 0),
        projects: { name: projectName },
      },
    ];
  }, [plot, projectName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate">Sell / Book</div>
              <div className="text-xs text-zinc-500 font-normal truncate">
                {projectName} • Plot {plot.plot_number}
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-zinc-500">Loading…</div>
        ) : (
          <div className="flex justify-center">
            <SaleForm
              plots={plotsForForm as any[]}
              customers={customers}
              advisors={advisors}
              initialPlotId={plot.id}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

