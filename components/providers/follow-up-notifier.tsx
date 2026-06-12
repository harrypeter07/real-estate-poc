"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getTodaysFollowUps } from "@/app/actions/enquiries";

export default function FollowUpNotifier() {
	useEffect(() => {
		async function checkAndNotify() {
			try {
				// 1. Get today's local date string (YYYY-MM-DD)
				const today = new Date();
				const offset = today.getTimezoneOffset();
				const localToday = new Date(today.getTime() - offset * 60 * 1000);
				const todayStr = localToday.toISOString().slice(0, 10);

				// 2. Manage the notified IDs list and reset if it's a new day
				const lastNotifiedDate = localStorage.getItem("last_notified_follow_up_date");
				let notifiedIds: string[] = [];

				if (lastNotifiedDate !== todayStr) {
					// New day starts! Clear old notified IDs
					localStorage.setItem("last_notified_follow_up_date", todayStr);
					localStorage.setItem("notified_follow_up_ids", "[]");
				} else {
					// Same day, load existing notified IDs
					try {
						notifiedIds = JSON.parse(localStorage.getItem("notified_follow_up_ids") || "[]");
					} catch (e) {
						notifiedIds = [];
					}
				}

				// 3. Fetch today's follow-ups from database
				const followUps = await getTodaysFollowUps();
				if (!followUps || followUps.length === 0) {
					return; // No follow-ups for today
				}

				// 4. Filter only NEW follow-ups that haven't been notified yet
				const newFollowUps = followUps.filter((item) => !notifiedIds.includes(item.id));
				if (newFollowUps.length === 0) {
					return; // No new follow-ups to show
				}

				// 5. Request Browser Notification Permission if needed
				let canNotifyBrowser = false;
				if (typeof window !== "undefined" && "Notification" in window) {
					if (Notification.permission === "granted") {
						canNotifyBrowser = true;
					} else if (Notification.permission !== "denied") {
						const permission = await Notification.requestPermission();
						canNotifyBrowser = permission === "granted";
					}
				}

				// 6. Trigger notifications one-by-one with a delay
				newFollowUps.forEach((item, index) => {
					setTimeout(() => {
						// Inside-app Toast Alert
						toast.info(`⏰ Follow-up Today: ${item.name}`, {
							description: `Phone: ${item.phone} | Category: ${item.category}${
								item.details ? ` | Details: ${item.details}` : ""
							}`,
							duration: 10000,
						});

						// Native Browser Notification
						if (canNotifyBrowser) {
							try {
								new Notification(`Follow-up Today: ${item.name}`, {
									body: `${item.phone} - ${item.details || "No details provided"}`,
									icon: "/icon-192.png",
									tag: item.id,
								});
							} catch (err) {
								console.error("Browser system notification failed:", err);
							}
						}
					}, index * 1500); // 1.5 seconds delay between each lead
				});

				// 7. Save updated notified IDs back to localStorage
				const updatedIds = [...notifiedIds, ...newFollowUps.map((item) => item.id)];
				localStorage.setItem("notified_follow_up_ids", JSON.stringify(updatedIds));
			} catch (error) {
				console.error("Failed to run follow-up notifier:", error);
			}
		}

		// Initial check after 3 seconds
		const timer = setTimeout(() => {
			void checkAndNotify();
		}, 3000);

		// Background interval checks every 30 seconds
		const interval = setInterval(() => {
			void checkAndNotify();
		}, 30000);

		return () => {
			clearTimeout(timer);
			clearInterval(interval);
		};
	}, []);

	return null;
}
