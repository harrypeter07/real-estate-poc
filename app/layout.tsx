// filepath: app/layout.tsx
import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: {
		default: "MG Infra CRM | Real Estate & Plot Management",
		template: "%s | MG Infra CRM",
	},
	description:
		"Advanced CRM system for real estate plot management, advisor commissions, and customer follow-ups by MG Infra Nagpur.",
	keywords: [
		"real estate",
		"crm",
		"plot management",
		"mg infra",
		"nagpur",
		"advisor commissions",
	],
	authors: [{ name: "MG Infra" }],
	creator: "MG Infra",
	publisher: "MG Infra",
	icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "MG Infra CRM | Real Estate & Plot Management",
    description: "Advanced CRM system for real estate plot management, advisor commissions, and customer follow-ups by MG Infra Nagpur.",
    url: "https://mginfra-crm.vercel.app",
    siteName: "MG Infra CRM",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MG Infra CRM | Real Estate & Plot Management",
    description: "Advanced CRM system for real estate plot management, advisor commissions, and customer follow-ups by MG Infra Nagpur.",
  },
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={cn("font-sans", geist.variable)}
			suppressHydrationWarning
		>
			<body className={inter.className} suppressHydrationWarning>
				{children}
				<Toaster position="top-right" richColors closeButton />
			</body>
		</html>
	);
}
