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

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [router]);

	return null;
}
