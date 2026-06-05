"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function GlobalSearchListener() {
	const router = useRouter();

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			const isCtrlK = (e.ctrlKey || e.metaKey) && e.key === "k";
			if (!isCtrlK) return;

			// Don't trigger when typing inside inputs/textareas/contenteditable
			const tag = (document.activeElement as HTMLElement)?.tagName ?? "";
			if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
			if ((document.activeElement as HTMLElement)?.isContentEditable) return;

			e.preventDefault();
			router.push("/search");
		}

		function handleWheel(e: WheelEvent) {
			const active = document.activeElement;
			const target = e.target as HTMLElement | null;

			const isFocusedNumberInput =
				active &&
				active.tagName === "INPUT" &&
				(active as HTMLInputElement).type === "number";

			const isHoveredNumberInput =
				target &&
				target.tagName === "INPUT" &&
				(target as HTMLInputElement).type === "number";

			if (isFocusedNumberInput || isHoveredNumberInput) {
				e.preventDefault();

				let deltaX = e.deltaX;
				let deltaY = e.deltaY;

				if (e.deltaMode === 1) { // DOM_DELTA_LINE
					deltaX *= 16;
					deltaY *= 16;
				} else if (e.deltaMode === 2) { // DOM_DELTA_PAGE
					deltaX *= window.innerWidth;
					deltaY *= window.innerHeight;
				}

				// Find nearest scrollable parent of the hovered element
				let parent = e.target as HTMLElement | null;
				let scrollParent: HTMLElement | null = null;
				while (parent) {
					if (parent === document.body || parent === document.documentElement) {
						break;
					}
					const style = window.getComputedStyle(parent);
					const isScrollableY = parent.scrollHeight > parent.clientHeight && (style.overflowY === "auto" || style.overflowY === "scroll");
					const isScrollableX = parent.scrollWidth > parent.clientWidth && (style.overflowX === "auto" || style.overflowX === "scroll");
					if (isScrollableY || isScrollableX) {
						scrollParent = parent;
						break;
					}
					parent = parent.parentElement;
				}

				if (scrollParent) {
					scrollParent.scrollBy({
						left: deltaX,
						top: deltaY,
						behavior: "auto"
					});
				} else {
					window.scrollBy({
						left: deltaX,
						top: deltaY,
						behavior: "auto"
					});
				}
			}
		}

		document.addEventListener("wheel", handleWheel, { passive: false, capture: true });
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("wheel", handleWheel, { capture: true });
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [router]);

	return null;
}
