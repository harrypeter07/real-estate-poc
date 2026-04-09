// filepath: app/layout.tsx
import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { BusinessDocumentTitle } from "@/components/layout/business-document-title";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"] });

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
};

export const metadata: Metadata = {
	title: {
		default: "CRM | Real Estate & Plot Management",
		template: "%s | CRM",
	},
	description:
		"CRM system for real estate plot management, advisor commissions, and customer follow-ups.",
	keywords: [
		"real estate",
		"crm",
		"plot management",
		"advisor commissions",
	],
	authors: [{ name: "CRM" }],
	creator: "CRM",
	publisher: "CRM",
	icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "CRM | Real Estate & Plot Management",
    description: "CRM system for real estate plot management, advisor commissions, and customer follow-ups.",
    siteName: "CRM",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CRM | Real Estate & Plot Management",
    description: "CRM system for real estate plot management, advisor commissions, and customer follow-ups.",
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
				<BusinessDocumentTitle />
				<Toaster position="top-right" richColors closeButton />
			</body>
		</html>
	);
}
