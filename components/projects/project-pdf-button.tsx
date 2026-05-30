"use client";

import { useState } from "react";
import { FileText, Download, Share2, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";

// Define project & plots types matching the schema
interface ProjectData {
	id: string;
	name: string;
	code: string;
	location: string | null;
	project_type: string | null;
	total_plots_count: number | null;
	starting_price: number | null;
	rate_per_sqft: number | null;
	plc_charges: number | null;
	registration_charges: number | null;
	down_payment_percentage?: number | null;
	emi_months: number | null;
	emi_type: string | null;
	offer_details: string | null;
	description: string | null;
	amenities: string | null;
	nearby_locations: string | null;
}

interface PlotData {
	id: string;
	plot_number: string;
	size_sqft: number;
	rate_per_sqft: number;
	status: string;
	facing: string | null;
	type?: string | null;
}

interface BusinessProfile {
	id: string;
	name: string;
	display_name: string | null;
	tagline: string | null;
	address: string | null;
	phone: string | null;
	email: string | null;
	gst_number: string | null;
	receipt_footer?: string | null;
}

interface PlotCounts {
	total: number;
	available: number;
	token: number;
	agreement: number;
	sold: number;
}

interface ProjectPdfButtonProps {
	project: ProjectData;
	plots: PlotData[];
	businessProfile: BusinessProfile | null;
	plotCounts: PlotCounts;
}

export function ProjectPdfButton({
	project,
	plots,
	businessProfile,
	plotCounts,
}: ProjectPdfButtonProps) {
	const [generating, setGenerating] = useState(false);

	const businessName =
		businessProfile?.display_name ||
		businessProfile?.name ||
		"Sinfra Properties";
	const tagline = businessProfile?.tagline || "Building Dreams into Reality";
	const address = businessProfile?.address || "";
	const phone = businessProfile?.phone || "";
	const email = businessProfile?.email || "";
	const gst = businessProfile?.gst_number || "";

	const generatePdfDoc = () => {
		const doc = new jsPDF({
			orientation: "portrait",
			unit: "mm",
			format: "a4",
		});

		const formatPdfCurrency = (amount: number | null | undefined) => {
			if (amount == null || amount === 0) return "—";
			return formatCurrency(amount).replace("₹", "Rs. ");
		};

		// Color palette (harmonious dark charcoal, emerald green, muted gray)
		const primaryColor = [16, 185, 129]; // Emerald Green
		const secondaryColor = [31, 41, 55]; // Dark Charcoal
		const accentColor = [245, 158, 11]; // Amber
		const mutedColor = [113, 113, 122]; // Slate Gray

		// --- PAGE 1: Header / Cover Info ---
		// Header Banner
		doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
		doc.rect(0, 0, 210, 36, "F");

		// Company Brand
		doc.setTextColor(255, 255, 255);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(18);
		doc.text(businessName, 15, 15);

		doc.setFont("helvetica", "italic");
		doc.setFontSize(9);
		doc.setTextColor(200, 200, 200);
		doc.text(tagline, 15, 21);

		// Contact details on the right
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.setTextColor(210, 210, 210);
		let contactX = 145;
		let contactY = 12;
		if (phone) {
			doc.text(`Phone: ${phone}`, contactX, contactY);
			contactY += 4.5;
		}
		if (email) {
			doc.text(`Email: ${email}`, contactX, contactY);
			contactY += 4.5;
		}
		if (gst) {
			doc.text(`GST: ${gst}`, contactX, contactY);
		}

		// Top green stripe separator
		doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
		doc.rect(0, 36, 210, 2, "F");

		// Project Title
		doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(16);
		doc.text(project.name, 15, 48);

		// Location Info
		doc.setFont("helvetica", "normal");
		doc.setFontSize(9.5);
		doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
		doc.text(
			`Location: ${project.location || "Not Set"}  |  Code: ${project.code}`,
			15,
			54
		);

		// --- Summary Dashboard ---
		let statY = 60;
		doc.setFillColor(244, 244, 245);
		doc.roundedRect(15, statY, 180, 20, 1.5, 1.5, "F");

		doc.setFont("helvetica", "bold");
		doc.setFontSize(8);
		doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
		doc.text("TOTAL PLOTS", 22, statY + 6);
		doc.text("AVAILABLE", 67, statY + 6);
		doc.text("BOOKED / TOKEN", 112, statY + 6);
		doc.text("SOLD", 157, statY + 6);

		doc.setFontSize(12);
		doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
		doc.text(String(plotCounts.total), 22, statY + 14);
		doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
		doc.text(String(plotCounts.available), 67, statY + 14);
		doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
		doc.text(String(plotCounts.token), 112, statY + 14);
		doc.setTextColor(239, 68, 68);
		doc.text(String(plotCounts.sold), 157, statY + 14);

		// --- Specifications Table ---
		let specY = 88;
		doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(11);
		doc.text("Project Specifications", 15, specY);

		doc.setDrawColor(228, 228, 231);
		doc.line(15, specY + 2, 195, specY + 2);

		const details = [
			[
				"Project Type:",
				project.project_type || "Plot",
				"Starting Price:",
				project.starting_price ? formatPdfCurrency(project.starting_price) : "—",
			],
			[
				"Rate per sqft:",
				project.rate_per_sqft ? `${formatPdfCurrency(project.rate_per_sqft)}/sqft` : "—",
				"PLC Charges:",
				project.plc_charges ? formatPdfCurrency(project.plc_charges) : "—",
			],
			[
				"Registration Charges:",
				project.registration_charges ? formatPdfCurrency(project.registration_charges) : "—",
				"Down Payment:",
				project.down_payment_percentage
					? formatPdfCurrency(project.down_payment_percentage)
					: "—",
			],
			[
				"EMI Months:",
				project.emi_months ? `${project.emi_months} Months` : "—",
				"EMI Type:",
				project.emi_type || "Fixed",
			],
		];

		doc.setFontSize(9);
		let rowY = specY + 8;
		details.forEach((row) => {
			doc.setFont("helvetica", "bold");
			doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
			doc.text(row[0], 15, rowY);
			doc.setFont("helvetica", "normal");
			doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
			doc.text(String(row[1]), 58, rowY);

			doc.setFont("helvetica", "bold");
			doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
			doc.text(row[2], 110, rowY);
			doc.setFont("helvetica", "normal");
			doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
			doc.text(String(row[3]), 156, rowY);

			rowY += 6;
		});

		// Promotion Offer details
		if (project.offer_details) {
			doc.setFillColor(236, 253, 245);
			doc.setDrawColor(16, 185, 129);
			doc.roundedRect(15, rowY + 2, 180, 11, 0.75, 0.75, "FD");

			doc.setFont("helvetica", "bold");
			doc.setFontSize(8.5);
			doc.setTextColor(16, 185, 129);
			doc.text("Special Offer:", 18, rowY + 9.5);

			doc.setFont("helvetica", "normal");
			doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
			doc.text(project.offer_details, 42, rowY + 9.5);
			rowY += 18;
		} else {
			rowY += 4;
		}

		// About, Amenities & Location Highlights with dynamic page-breaking
		let textY = rowY + 4;

		const checkPageOverflow = (neededHeight: number) => {
			if (textY + neededHeight > 275) {
				doc.addPage();
				
				// Overflow Page header
				doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
				doc.rect(0, 0, 210, 12, "F");
				doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
				doc.rect(0, 12, 210, 0.5, "F");
				
				doc.setTextColor(255, 255, 255);
				doc.setFont("helvetica", "bold");
				doc.setFontSize(9);
				doc.text(`${project.name} - Project Highlights`, 15, 7.5);
				
				textY = 20;
			}
		};

		if (project.description) {
			const splitDesc = doc.splitTextToSize(project.description, 180);
			const needed = 6 + splitDesc.length * 4;
			checkPageOverflow(needed);

			doc.setFont("helvetica", "bold");
			doc.setFontSize(10);
			doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
			doc.text("About Project", 15, textY);
			doc.setFont("helvetica", "normal");
			doc.setFontSize(8.5);
			doc.setTextColor(55, 65, 81);
			doc.text(splitDesc, 15, textY + 4.5);
			textY += needed;
		}

		if (project.amenities) {
			const splitAmen = doc.splitTextToSize(project.amenities, 180);
			const needed = 6 + splitAmen.length * 4;
			checkPageOverflow(needed);

			doc.setFont("helvetica", "bold");
			doc.setFontSize(10);
			doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
			doc.text("Amenities Available", 15, textY);
			doc.setFont("helvetica", "normal");
			doc.setFontSize(8.5);
			doc.setTextColor(55, 65, 81);
			doc.text(splitAmen, 15, textY + 4.5);
			textY += needed;
		}

		if (project.nearby_locations) {
			const splitNear = doc.splitTextToSize(project.nearby_locations, 180);
			const needed = 6 + splitNear.length * 4;
			checkPageOverflow(needed);

			doc.setFont("helvetica", "bold");
			doc.setFontSize(10);
			doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
			doc.text("Nearby Highlights", 15, textY);
			doc.setFont("helvetica", "normal");
			doc.setFontSize(8.5);
			doc.setTextColor(55, 65, 81);
			doc.text(splitNear, 15, textY + 4.5);
			textY += needed;
		}

		// --- PAGE 2: Plot/Unit Visual Grid Map ---
		const drawLegend = (x: number, y: number) => {
			const statuses = [
				{ label: "Available", color: [230, 244, 234], border: [16, 185, 129] },
				{ label: "Booked", color: [254, 243, 199], border: [245, 158, 11] },
				{ label: "Sold", color: [252, 228, 228], border: [239, 68, 68] },
			];
			doc.setFont("helvetica", "normal");
			doc.setFontSize(7.5);
			let curX = x;
			statuses.forEach((st) => {
				doc.setFillColor(st.color[0], st.color[1], st.color[2]);
				doc.setDrawColor(st.border[0], st.border[1], st.border[2]);
				doc.rect(curX, y - 2.5, 4, 3, "FD");
				doc.setTextColor(55, 65, 81);
				doc.text(st.label, curX + 5, y);
				curX += 20;
			});
		};

		const drawTinyHome = (x: number, y: number, color: number[]) => {
			doc.setDrawColor(color[0], color[1], color[2]);
			doc.setLineWidth(0.18);
			// Draw roof: triangle
			doc.line(x - 1.6, y + 0.4, x, y - 1.2);
			doc.line(x, y - 1.2, x + 1.6, y + 0.4);
			// Draw walls: square
			doc.line(x - 1.3, y + 0.4, x - 1.3, y + 2.0);
			doc.line(x + 1.3, y + 0.4, x + 1.3, y + 2.0);
			doc.line(x - 1.3, y + 2.0, x + 1.3, y + 2.0);
			// Draw door
			doc.line(x - 0.4, y + 2.0, x - 0.4, y + 1.2);
			doc.line(x + 0.4, y + 2.0, x + 0.4, y + 1.2);
			doc.line(x - 0.4, y + 1.2, x + 0.4, y + 1.2);
		};

		const getStatusConfig = (statusStr: string) => {
			const s = String(statusStr || "available").trim().toLowerCase();
			if (s === "token") {
				return {
					bgColor: [254, 243, 199],      // Light amber
					borderColor: [245, 158, 11],    // Amber
					textColor: [146, 64, 14],       // Dark amber
					label: "TOKEN"
				};
			}
			if (s === "sold" || s === "agreement" || s === "sold_without_data") {
				return {
					bgColor: [252, 228, 228],      // Light red
					borderColor: [239, 68, 68],     // Red
					textColor: [153, 27, 27],       // Dark red
					label: "SOLD"
				};
			}
			// default is available
			return {
				bgColor: [230, 244, 234],        // Light green
				borderColor: [16, 185, 129],      // Green
				textColor: [6, 95, 70],           // Dark green
				label: "AVAILABLE"
			};
		};

		const sortedPlots = [...plots].sort((a, b) => {
			return new Intl.Collator(undefined, {
				numeric: true,
				sensitivity: "base",
			}).compare(String(a.plot_number || ""), String(b.plot_number || ""));
		});

		let plotIndex = 0;
		let pageNum = 2;

		const startNewGridPage = () => {
			doc.addPage();
			pageNum++;
			
			// Banner Header Page 2+
			doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
			doc.rect(0, 0, 210, 15, "F");
			doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
			doc.rect(0, 15, 210, 1, "F");

			doc.setTextColor(255, 255, 255);
			doc.setFont("helvetica", "bold");
			doc.setFontSize(10);
			doc.text(`${project.name} - Visual Layout Grid`, 15, 10);

			doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
			doc.setFont("helvetica", "bold");
			doc.setFontSize(10);
			doc.text("Interactive Unit Layout Map", 15, 25);
			
			// Draw Legend at top right
			drawLegend(125, 25);
		};

		// Call initially for Page 2
		startNewGridPage();

		const boxWidth = 13;
		const boxHeight = 17;
		const hSpacing = 1.5;
		const vSpacing = 2.0;
		const startX = 18.75;
		const startY = 32;
		const cols = 12;

		sortedPlots.forEach((plot, index) => {
			plotIndex = index;
			const pageIndex = index % 156;
			if (index > 0 && pageIndex === 0) {
				startNewGridPage();
			}

			const col = pageIndex % cols;
			const row = Math.floor(pageIndex / cols);

			const boxX = startX + col * (boxWidth + hSpacing);
			const boxY = startY + row * (boxHeight + vSpacing);

			const cfg = getStatusConfig(plot.status);

			// Draw box background & border
			doc.setFillColor(cfg.bgColor[0], cfg.bgColor[1], cfg.bgColor[2]);
			doc.setDrawColor(cfg.borderColor[0], cfg.borderColor[1], cfg.borderColor[2]);
			doc.setLineWidth(0.25);
			doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 0.75, 0.75, "FD");

			// Plot number centered in cell width (13mm)
			doc.setFont("helvetica", "bold");
			doc.setFontSize(6.5);
			doc.setTextColor(31, 41, 55);
			doc.text(`#${plot.plot_number}`, boxX + 6.5, boxY + 3.8, { align: "center" });

			// Small status indicator dot
			doc.setFillColor(cfg.borderColor[0], cfg.borderColor[1], cfg.borderColor[2]);
			doc.circle(boxX + boxWidth - 1.8, boxY + 2.2, 0.5, "F");

			// Draw Tiny vector home icon centered at boxY + 7.5
			drawTinyHome(boxX + 6.5, boxY + 7.5, cfg.borderColor);

			// Type text
			const typeText = String(plot.type || "plot").toUpperCase();
			doc.setFont("helvetica", "bold");
			doc.setFontSize(4.2);
			doc.setTextColor(cfg.textColor[0], cfg.textColor[1], cfg.textColor[2]);
			doc.text(typeText, boxX + 6.5, boxY + 13.0, { align: "center" });

			// Size text
			const size = Number(plot.size_sqft || 0);
			const sizeText = size > 0 ? `${size} sqft` : "0 sqft";
			doc.setFont("helvetica", "normal");
			doc.setFontSize(4.2);
			doc.setTextColor(75, 85, 99);
			doc.text(sizeText, boxX + 6.5, boxY + 16.0, { align: "center" });
		});

		// Stamp footers & page numbers on ALL generated pages dynamically
		const totalPages = doc.getNumberOfPages();
		for (let i = 1; i <= totalPages; i++) {
			doc.setPage(i);
			
			// Draw nice light separator line above footer
			doc.setDrawColor(240, 240, 240);
			doc.setLineWidth(0.2);
			doc.line(15, 283, 195, 283);
			
			doc.setFont("helvetica", "normal");
			doc.setFontSize(7.5);
			doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
			
			const footerText = businessProfile?.receipt_footer || "Disclaimer: Layout designs and pricing details are subject to verification.";
			doc.text(footerText, 15, 287);
			doc.text(`Page ${i} of ${totalPages}`, 180, 287);
		}

		return doc;
	};

	const handleDownload = () => {
		setGenerating(true);
		try {
			const doc = generatePdfDoc();
			doc.save(`${project.name.replace(/\s+/g, "_")}_Details.pdf`);
			toast.success("PDF downloaded successfully");
		} catch (error) {
			console.error("PDF download failed:", error);
			toast.error("Failed to generate PDF");
		} finally {
			setGenerating(false);
		}
	};

	const handleShare = async () => {
		setGenerating(true);
		try {
			const doc = generatePdfDoc();
			const pdfBlob = doc.output("blob");
			const fileName = `${project.name.replace(/\s+/g, "_")}_Details.pdf`;
			const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

			// Web Share API (available on most mobile browsers and WhatsApp native attachments)
			if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
				await navigator.share({
					files: [pdfFile],
					title: `${project.name} - Project Details`,
					text: `Check out the layout, pricing structure and active inventory for project: ${project.name}`,
				});
				toast.success("Shared successfully");
			} else {
				// Text fallback for desktop / Web WhatsApp redirect
				const shareText =
					`*${project.name} - Project details*\n` +
					`🏢 *Builder:* ${businessName}\n` +
					`📍 *Location:* ${project.location || "—"}\n` +
					`🏷️ *Project Type:* ${project.project_type || "Plot"}\n` +
					`💰 *Starting Price:* ${project.starting_price ? formatCurrency(project.starting_price) : "—"}\n` +
					`📈 *Inventory status:* Total: ${plotCounts.total} | Available: ${plotCounts.available} | Sold: ${plotCounts.sold}\n` +
					(project.offer_details ? `🎁 *Active Offer:* ${project.offer_details}\n` : "") +
					`📞 Contact us for layouts and bookings.`;

				const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
				window.open(whatsappUrl, "_blank");
				toast.success("WhatsApp sharing redirect launched");
			}
		} catch (error) {
			console.error("PDF share failed:", error);
			toast.error("Failed to share PDF");
		} finally {
			setGenerating(false);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					size="sm"
					variant="outline"
					disabled={generating}
					className="h-8 transition-all hover:bg-zinc-50 border-zinc-200 shadow-sm"
				>
					{generating ? (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					) : (
						<FileText className="h-4 w-4 mr-2 text-zinc-500" />
					)}
					Project PDF Report
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuItem onClick={handleDownload} className="cursor-pointer">
					<Download className="h-4 w-4 mr-2 text-zinc-500" />
					Download PDF
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleShare} className="cursor-pointer">
					<Share2 className="h-4 w-4 mr-2 text-emerald-600" />
					Share on WhatsApp
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
