"use client";

import { useEffect } from "react";

export function BusinessDocumentTitle() {
	useEffect(() => {
		try {
			const name = String(localStorage.getItem("app_business_display_name") ?? "").trim();
			if (name) document.title = `${name} | CRM`;
			else document.title = "Business name not set | CRM";
		} catch {
			// ignore
		}
	}, []);

	return null;
}

