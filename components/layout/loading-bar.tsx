"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { DotmSquare4 } from "@/components/ui/dotm-square-4";

function LoadingOverlayContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // When the path or search params change, it means the navigation is complete
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // 1. Standard Anchor link click
      const anchor = target.closest("a");
      if (
        anchor &&
        anchor instanceof HTMLAnchorElement &&
        anchor.href &&
        anchor.target !== "_blank" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey &&
        anchor.href.startsWith(window.location.origin) &&
        anchor.href !== window.location.href
      ) {
        setLoading(true);
        return;
      }

      // 2. Programmatic click triggers for ProjectCard / View Plots / Details / Edit actions
      const clickable = target.closest("button, a, [role='button'], .cursor-pointer");
      if (clickable) {
        const text = clickable.textContent?.trim() || "";

        // Detect "View Plots" or "Details" buttons
        if (
          text.includes("View Plots") ||
          text === "Details" ||
          text.includes("Edit Details")
        ) {
          setLoading(true);
          return;
        }

        // Detect clicking on the ProjectCard body container
        if (
          clickable.classList.contains("cursor-pointer") &&
          clickable.classList.contains("group") &&
          clickable.querySelector(".truncate") // Unique class of project name in card
        ) {
          setLoading(true);
          return;
        }
      }
    };

    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      const t = setTimeout(() => setOpacity(1), 20);
      return () => clearTimeout(t);
    } else {
      setOpacity(0);
      const t = setTimeout(() => setVisible(false), 250); // 250ms smooth fade-out transition
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-zinc-950/20 backdrop-blur-[3px] transition-all duration-300 ease-out"
      style={{
        opacity,
        pointerEvents: opacity === 1 ? "auto" : "none",
      }}
    >
      <div className="flex flex-col items-center gap-3 transition-all duration-300 ease-out scale-95">
        <DotmSquare4
          pattern="cross"
          colorPreset="grad-aurora"
          speed={0.8}
          muted
          animated
          size={42}
          dotSize={5.5}
          opacityBase={0.3}
          opacityMid={0.65}
          opacityPeak={1.0}
          bloom
        />
        <span className="text-[9px] font-extrabold tracking-[0.25em] text-black dark:text-zinc-50 uppercase select-none animate-pulse">
          Loading
        </span>
      </div>
    </div>
  );
}

export function LoadingBar() {
  return (
    <Suspense fallback={null}>
      <LoadingOverlayContent />
    </Suspense>
  );
}

