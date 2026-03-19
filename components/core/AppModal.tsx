"use client";

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";

const sizeClass: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  headerRight,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sizeClass[size]}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate">{title}</div>
              {description ? (
                <DialogDescription className="truncate">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
            {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

