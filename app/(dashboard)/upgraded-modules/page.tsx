"use client";

import { useState, useMemo } from "react";
import {
	Sparkles,
	Search,
	Plus,
	Check,
	X,
	Info,
	Lock,
	Unlock,
	FileText,
	Send,
	Share2,
	User,
	Users,
	CheckCircle2,
	AlertTriangle,
	TrendingUp,
	Coins,
	Receipt,
	Bell,
	FileSpreadsheet,
	UserCheck,
	Settings,
	AlertOctagon,
	Moon,
	Sun,
	Briefcase,
	Calendar,
	Building2,
	Eye,
	Edit,
	Trash,
	Download,
	Percent,
	Clock,
	ShieldAlert,
	FolderCheck
} from "lucide-react";
import { Button, Input, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";

// ==========================================
// INTERFACES & SCHEMA DEFINITIONS
// ==========================================

interface CommissionItem {
	id: string;
	advisorName: string;
	projectName: string;
	totalAmount: number;
	paidAmount: number;
	holdStatus: boolean;
	holdReason: string | null;
	holdNotes: string;
	autoCalculated: boolean;
	subAdvisorName: string | null;
	subAdvisorSplitPct: number;
	createdAt: string;
}

interface CommissionLedgerItem {
	id: string;
	date: string;
	advisor: string;
	type: string;
	amount: number;
	balance: number;
	desc: string;
}

interface ExpenseItem {
	id: string;
	description: string;
	amount: number;
	date: string;
	category: string;
	project: string;
	vendor: string;
	invoice: string;
	status: string;
	approvedBy: string | null;
	approvedAt: string | null;
	note: string;
}

interface AnnouncementItem {
	id: string;
	title: string;
	type: string;
	body: string;
	targetRoles: string[];
	expiresAt: string;
	pinned: boolean;
	reads: number;
}

interface ReminderItem {
	id: string;
	title: string;
	type: string;
	phone: string;
	date: string;
	isSent: boolean;
	sentAt: string | null;
	customerName: string;
}

interface WhatsappLogItem {
	id: string;
	sharedBy: string;
	type: string;
	customerName: string;
	phone: string;
	message: string;
	sharedAt: string;
}

interface EmployeeItem {
	id: string;
	code: string;
	name: string;
	email: string;
	phone: string;
	role: string;
	department: string;
	joiningDate: string;
	status: string;
}

interface LeaveItem {
	id: string;
	employeeName: string;
	leaveFrom: string;
	leaveTo: string;
	days: number;
	leaveType: string;
	reason: string;
	status: string;
	approvedBy: string | null;
	approvedAt: string | null;
	rejectReason: string;
}

interface ReportItem {
	id: string;
	type: string;
	format: "excel" | "pdf" | "csv";
	filters: string;
	generatedBy: string;
	rowCount: number;
	status: string;
	date: string;
}

interface RecoveryItem {
	id: string;
	customerName: string;
	phone: string;
	project: string;
	plotNo: string;
	overdueEmis: number;
	overdueAmount: number;
	delayDays: number;
	stage: "reminder" | "follow_up" | "warning" | "legal_notice";
}

interface PromiseItem {
	id: string;
	customerName: string;
	promisedAmount: number;
	promisedDate: string;
	status: string;
	notes: string;
}

interface LegalEscalationItem {
	id: string;
	customerName: string;
	legalStage: "notice_sent" | "petition_filed" | "hearing" | "resolved";
	totalOverdue: number;
	noticeDate: string;
	lawyerName: string;
	lawyerContact: string;
	courtDate: string | null;
	contact: string;
	notes: string;
	caseNumber: string;
}

interface CompanySettings {
	name: string;
	displayName: string;
	tagline: string;
	address: string;
	phone: string;
	email: string;
	gstNumber: string;
	panNumber: string;
	logoUrl: string;
}

interface CrmSettings {
	leadStages: string;
	leadSources: string;
	siteVisitRequired: boolean;
	autoAssignAdvisor: boolean;
}

interface FinancialSettings {
	commissionDefaults: string;
	penaltyRatePerDay: number;
	penaltyGraceDays: number;
	receiptPrefix: string;
}

interface NotificationSettings {
	emiReminderDays: number;
	followUpAlerts: boolean;
	overdueAlerts: boolean;
	dailyDigest: boolean;
}

interface BusinessSettings {
	company: CompanySettings;
	crm: CrmSettings;
	financial: FinancialSettings;
	notifications: NotificationSettings;
}

interface PermissionItem {
	roleName: string;
	moduleKey: string;
	view: boolean;
	create: boolean;
	edit: boolean;
	delete: boolean;
	export: boolean;
}

// ==========================================
// DUMMY DATA FOR ALL 8 UPGRADED MODULES
// ==========================================

// Module 10: Commissions Mock Data
const INITIAL_COMMISSIONS: CommissionItem[] = [
	{ id: "comm-1", advisorName: "Rahul Sharma", projectName: "Green Valley Phase 1", totalAmount: 150000, paidAmount: 120000, holdStatus: false, holdReason: null, holdNotes: "", autoCalculated: true, subAdvisorName: "Amit Patel", subAdvisorSplitPct: 20, createdAt: "2026-05-10" },
	{ id: "comm-2", advisorName: "Priya Nair", projectName: "Royal Palms Residency", totalAmount: 280000, paidAmount: 0, holdStatus: true, holdReason: "pending_kyc", holdNotes: "Waiting for PAN card verification", autoCalculated: true, subAdvisorName: null, subAdvisorSplitPct: 0, createdAt: "2026-05-18" },
	{ id: "comm-3", advisorName: "Vikram Malhotra", projectName: "Metro Height Apartments", totalAmount: 95000, paidAmount: 95000, holdStatus: false, holdReason: null, holdNotes: "", autoCalculated: false, subAdvisorName: "Sanjay Sen", subAdvisorSplitPct: 15, createdAt: "2026-05-22" },
	{ id: "comm-4", advisorName: "Sneha Gupta", projectName: "Green Valley Phase 1", totalAmount: 180000, paidAmount: 0, holdStatus: true, holdReason: "dispute", holdNotes: "Client raised cancellation request", autoCalculated: true, subAdvisorName: null, subAdvisorSplitPct: 0, createdAt: "2026-05-24" }
];

const INITIAL_COMMISSION_LEDGER: CommissionLedgerItem[] = [
	{ id: "ledg-1", date: "2026-05-10", advisor: "Rahul Sharma", type: "earned", amount: 150000, balance: 150000, desc: "Commission earned on Plot 45 - Green Valley" },
	{ id: "ledg-2", date: "2026-05-11", advisor: "Rahul Sharma", type: "paid", amount: -120000, balance: 30000, desc: "Paid via Bank Transfer ref TXN89324" },
	{ id: "ledg-3", date: "2026-05-18", advisor: "Priya Nair", type: "earned", amount: 280000, balance: 280000, desc: "Commission earned on Villa 12 - Royal Palms" },
	{ id: "ledg-4", date: "2026-05-18", advisor: "Priya Nair", type: "held", amount: -280000, balance: 0, desc: "Held due to incomplete KYC documentation" }
];

// Module 11: Expenses Mock Data
const INITIAL_EXPENSES: ExpenseItem[] = [
	{ id: "exp-1", description: "Land leveling equipment diesel", amount: 24500, date: "2026-05-08", category: "Construction / Layout", project: "Green Valley Phase 1", vendor: "Balaji Fuels", invoice: "BF-2026-89", status: "approved", approvedBy: "Admin Kumar", approvedAt: "2026-05-09", note: "Verified bills attached." },
	{ id: "exp-2", description: "Project site banners & brochures", amount: 18200, date: "2026-05-12", category: "Marketing & Ads", project: "Royal Palms Residency", vendor: "Om Graphics & Print", invoice: "OG-9832", status: "pending", approvedBy: null, approvedAt: null, note: "Awaiting marketing head confirmation." },
	{ id: "exp-3", description: "Office snacks & tea monthly", amount: 4800, date: "2026-05-20", category: "Office Admin", project: "Corporate Office", vendor: "Local Store", invoice: "CASH-BILL-10", status: "paid", approvedBy: "Admin Kumar", approvedAt: "2026-05-20", note: "Paid in cash directly." },
	{ id: "exp-4", description: "Legal consultant agreement drafting", amount: 15000, date: "2026-05-25", category: "Professional Fees", project: "Metro Height Apartments", vendor: "Sharma Associates", invoice: "SA-26-09", status: "rejected", approvedBy: "Admin Kumar", approvedAt: "2026-05-26", note: "Rejected: Duplicate invoice submitted." }
];

// Module 12: Messaging & Announcements
const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
	{ id: "ann-1", title: "Target Incentive Scheme - Q2 FY26", type: "general", body: "We are thrilled to announce a 1.5% extra commission payout for all advisors who complete 3+ plot registries in Green Valley Phase 1 before June 30.", targetRoles: ["sales", "advisor"], expiresAt: "2026-06-30", pinned: true, reads: 14 },
	{ id: "ann-2", title: "Mandatory KYC Submission Notice", type: "policy", body: "Please ensure all pending KYC documents are uploaded in the advisor console to prevent automatic holds on Q1 commission cycles.", targetRoles: ["advisor"], expiresAt: "2026-06-15", pinned: false, reads: 32 }
];

const INITIAL_REMINDERS: ReminderItem[] = [
	{ id: "rem-1", title: "Follow up: Rajesh Patel registry", type: "follow_up", phone: "9876543210", date: "2026-05-26", isSent: true, sentAt: "2026-05-26 10:15 AM", customerName: "Rajesh Patel" },
	{ id: "rem-2", title: "EMI Overdue: Plot 88 Ankit Gupta", type: "payment_reminder", phone: "9123456789", date: "2026-05-27", isSent: false, sentAt: null, customerName: "Ankit Gupta" }
];

const INITIAL_WHATSAPP_LOG: WhatsappLogItem[] = [
	{ id: "wa-1", sharedBy: "Admin Kumar", type: "payment_reminder", customerName: "Rajesh Patel", phone: "9876543210", message: "Dear Rajesh, your EMI of ₹25,000 for Green Valley Plot 14 is due tomorrow. Please pay to avoid penalty charges.", sharedAt: "2026-05-25 11:30 AM" },
	{ id: "wa-2", sharedBy: "Accounts Staff", type: "receipt_share", customerName: "Ankit Gupta", phone: "9123456789", message: "Receipt REC-8902-GV for payment of ₹50,000 has been verified. Download link: https://sinfra.co/rec/8902", sharedAt: "2026-05-26 09:45 AM" }
];

// Module 13: HR Mock Data
const INITIAL_EMPLOYEES: EmployeeItem[] = [
	{ id: "emp-1", code: "MGI-001", name: "Vikram Rathore", email: "vikram@mginfra.com", phone: "9827012345", role: "Sales Manager", department: "Sales & Marketing", joiningDate: "2024-02-15", status: "active" },
	{ id: "emp-2", code: "MGI-002", name: "Ananya Deshmukh", email: "ananya@mginfra.com", phone: "9009581234", role: "Accountant", department: "Finance & Accounts", joiningDate: "2024-06-10", status: "active" },
	{ id: "emp-3", code: "MGI-003", name: "Siddharth Sen", email: "siddharth@mginfra.com", phone: "7002012903", role: "Recovery Executive", department: "Customer Support", joiningDate: "2025-01-18", status: "active" }
];

const INITIAL_LEAVES: LeaveItem[] = [
	{ id: "leave-1", employeeName: "Vikram Rathore", leaveFrom: "2026-05-28", leaveTo: "2026-05-30", days: 3, leaveType: "casual", reason: "Family function in hometown", status: "pending", approvedBy: null, approvedAt: null, rejectReason: "" },
	{ id: "leave-2", employeeName: "Ananya Deshmukh", leaveFrom: "2026-05-22", leaveTo: "2026-05-22", days: 1, leaveType: "sick", reason: "Severe migraine", status: "approved", approvedBy: "Admin Kumar", approvedAt: "2026-05-22", rejectReason: "" }
];

// Module 14: Reports & Exports
const INITIAL_REPORTS: ReportItem[] = [
	{ id: "rep-1", type: "Monthly Sales Report", format: "excel", filters: "Date: May 2026, Project: All", generatedBy: "Admin Kumar", rowCount: 42, status: "completed", date: "2026-05-26" },
	{ id: "rep-2", type: "Advisors Payout Summary", format: "pdf", filters: "Hold Status: Active", generatedBy: "Admin Kumar", rowCount: 15, status: "completed", date: "2026-05-25" },
	{ id: "rep-3", type: "Consolidated Expense Ledger", format: "csv", filters: "Year: FY26, Project: Green Valley", generatedBy: "Accounts Staff", rowCount: 128, status: "pending", date: "2026-05-26" }
];

// Module 15: Recovery & Debt Mock Data
const INITIAL_RECOVERY: RecoveryItem[] = [
	{ id: "recov-1", customerName: "Rajesh Patel", phone: "9876543210", project: "Green Valley Phase 1", plotNo: "45-A", overdueEmis: 2, overdueAmount: 50000, delayDays: 45, stage: "follow_up" },
	{ id: "recov-2", customerName: "Sunil Grover", phone: "9911223344", project: "Metro Height Apartments", plotNo: "1203", overdueEmis: 4, overdueAmount: 180000, delayDays: 110, stage: "warning" },
	{ id: "recov-3", customerName: "Karan Johar", phone: "9090909090", project: "Royal Palms Residency", plotNo: "V-9", overdueEmis: 1, overdueAmount: 35000, delayDays: 20, stage: "reminder" },
	{ id: "recov-4", customerName: "Hitesh Mehta", phone: "7080901020", project: "Green Valley Phase 1", plotNo: "112", overdueEmis: 6, overdueAmount: 300000, delayDays: 195, stage: "legal_notice" }
];

const INITIAL_PROMISES: PromiseItem[] = [
	{ id: "prom-1", customerName: "Rajesh Patel", promisedAmount: 50000, promisedDate: "2026-05-28", status: "pending", notes: "Agreed to pay via UPI on phone call." },
	{ id: "prom-2", customerName: "Sunil Grover", promisedAmount: 80000, promisedDate: "2026-05-20", status: "broken", notes: "Broken: Promised cheque bounced." }
];

const INITIAL_LEGAL_ESCALATIONS: LegalEscalationItem[] = [
	{ id: "leg-1", customerName: "Hitesh Mehta", legalStage: "notice_sent", totalOverdue: 300000, noticeDate: "2026-05-10", lawyerName: "Adv. Alok Verma", lawyerContact: "9812345678", caseNumber: "NOT-2026-GV112", courtDate: null, contact: "9812345678", notes: "Notice served by speed post." }
];

// Module 17: Settings
const INITIAL_SETTINGS: BusinessSettings = {
	company: {
		name: "M.G. Infrastructure Developers",
		displayName: "M.G. Infra CRM",
		tagline: "Building Trust, Delivering Excellence",
		address: "405-408 Business Hub, Sector 62, Noida, UP - 201301",
		phone: "+91 120 4567890",
		email: "info@mginfra.com",
		gstNumber: "09AAACM1234E1Z0",
		panNumber: "AAACM1234E",
		logoUrl: "/images/logo.png"
	},
	crm: {
		leadStages: "new, contacted, follow_up, site_visit, negotiation, converted, lost",
		leadSources: "website, referral, walk_in, social_media, advertisement, advisor, exhibition, other",
		siteVisitRequired: false,
		autoAssignAdvisor: false
	},
	financial: {
		commissionDefaults: "token:2, agreement:2, registry:1, full_payment:1",
		penaltyRatePerDay: 50,
		penaltyGraceDays: 5,
		receiptPrefix: "REC"
	},
	notifications: {
		emiReminderDays: 3,
		followUpAlerts: true,
		overdueAlerts: true,
		dailyDigest: false
	}
};

const INITIAL_ROLES = ["admin", "sales", "recovery", "accounts", "legal", "hr"];
const INITIAL_MODULE_KEYS = ["dashboard", "enquiries", "sales", "payments", "commissions", "expenses", "messaging", "hr", "reports", "recovery", "advisors", "settings"];

const INITIAL_PERMISSIONS: PermissionItem[] = [
	{ roleName: "admin", moduleKey: "dashboard", view: true, create: true, edit: true, delete: true, export: true },
	{ roleName: "admin", moduleKey: "settings", view: true, create: true, edit: true, delete: true, export: true },
	{ roleName: "sales", moduleKey: "dashboard", view: true, create: false, edit: false, delete: false, export: false },
	{ roleName: "sales", moduleKey: "enquiries", view: true, create: true, edit: true, delete: false, export: true },
	{ roleName: "recovery", moduleKey: "recovery", view: true, create: true, edit: true, delete: false, export: true },
	{ roleName: "accounts", moduleKey: "payments", view: true, create: true, edit: true, delete: false, export: true },
	{ roleName: "accounts", moduleKey: "commissions", view: true, create: true, edit: true, delete: false, export: true },
	{ roleName: "accounts", moduleKey: "expenses", view: true, create: true, edit: true, delete: false, export: true }
];

export default function UpgradedModulesPage() {
	// Theme & View state
	const [activeTab, setActiveTab] = useState<
		"commissions" | "expenses" | "messaging" | "hr" | "reports" | "recovery" | "settings" | "permissions"
	>("commissions");
	const [darkMode, setDarkMode] = useState(false);

	// Search & States
	const [searchQuery, setSearchQuery] = useState("");

	// --- MODULE 10: Commissions State ---
	const [commissions, setCommissions] = useState<CommissionItem[]>(INITIAL_COMMISSIONS);
	const [ledgerLogs, setLedgerLogs] = useState<CommissionLedgerItem[]>(INITIAL_COMMISSION_LEDGER);
	const [selectedComm, setSelectedComm] = useState<any>(null);
	const [holdModalOpen, setHoldModalOpen] = useState(false);
	const [holdReason, setHoldReason] = useState("dispute");
	const [holdNotes, setHoldNotes] = useState("");

	// --- MODULE 11: Expenses State ---
	const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
	const [selectedExp, setSelectedExp] = useState<any>(null);
	const [expenseActionOpen, setExpenseActionOpen] = useState(false);
	const [actionNotes, setActionNotes] = useState("");

	// --- MODULE 12: Messaging State ---
	const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(INITIAL_ANNOUNCEMENTS);
	const [reminders, setReminders] = useState<ReminderItem[]>(INITIAL_REMINDERS);
	const [whatsappLogs, setWhatsappLogs] = useState<WhatsappLogItem[]>(INITIAL_WHATSAPP_LOG);
	const [reminderFilter, setReminderFilter] = useState("all");
	const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
	const [annTitle, setAnnTitle] = useState("");
	const [annBody, setAnnBody] = useState("");
	const [annType, setAnnType] = useState("general");

	// --- MODULE 13: HR State ---
	const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
	const [leaves, setLeaves] = useState<LeaveItem[]>(INITIAL_LEAVES);
	const [selectedLeave, setSelectedLeave] = useState<any>(null);
	const [leaveActionOpen, setLeaveActionOpen] = useState(false);
	const [leaveRejectReason, setLeaveRejectReason] = useState("");

	// --- MODULE 14: Reports State ---
	const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
	const [exportingType, setExportingType] = useState("");

	// --- MODULE 15: Recovery State ---
	const [recoveryList, setRecoveryList] = useState<RecoveryItem[]>(INITIAL_RECOVERY);
	const [promises, setPromises] = useState<PromiseItem[]>(INITIAL_PROMISES);
	const [escalations, setEscalations] = useState<LegalEscalationItem[]>(INITIAL_LEGAL_ESCALATIONS);
	const [escalationDrawerOpen, setEscalationDrawerOpen] = useState(false);
	const [selectedRecoveryCustomer, setSelectedRecoveryCustomer] = useState<any>(null);
	const [lawyerName, setLawyerName] = useState("");
	const [lawyerContact, setLawyerContact] = useState("");
	const [noticeRef, setNoticeRef] = useState("");
	const [escalationNotes, setEscalationNotes] = useState("");

	// --- MODULE 17: Settings State ---
	const [settings, setSettings] = useState<BusinessSettings>(INITIAL_SETTINGS);
	const [permissions, setPermissions] = useState<PermissionItem[]>(INITIAL_PERMISSIONS);

	// Dynamic calculation helpers
	const commissionsStats = useMemo(() => {
		const total = commissions.reduce((sum, c) => sum + c.totalAmount, 0);
		const paid = commissions.reduce((sum, c) => sum + c.paidAmount, 0);
		const held = commissions.filter((c) => c.holdStatus).reduce((sum, c) => sum + (c.totalAmount - c.paidAmount), 0);
		return { total, paid, held, count: commissions.length };
	}, [commissions]);

	const expensesStats = useMemo(() => {
		const pending = expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);
		const approved = expenses.filter((e) => e.status === "approved" || e.status === "paid").reduce((sum, e) => sum + e.amount, 0);
		const rejected = expenses.filter((e) => e.status === "rejected").reduce((sum, e) => sum + e.amount, 0);
		return { pending, approved, rejected, count: expenses.length };
	}, [expenses]);

	const recoveryStats = useMemo(() => {
		const totalOverdue = recoveryList.reduce((sum, r) => sum + r.overdueAmount, 0);
		const legalCases = escalations.length;
		const activePromises = promises.filter((p) => p.status === "pending").length;
		return { totalOverdue, legalCases, activePromises };
	}, [recoveryList, escalations, promises]);

	// Toggle Hold Action
	const handleHoldAction = (comm: any) => {
		if (comm.holdStatus) {
			// Release
			setCommissions(prev => prev.map(c => c.id === comm.id ? { ...c, holdStatus: false, holdReason: null, holdNotes: "" } : c));
			setLedgerLogs(prev => [
				{
					id: `ledg-${Date.now()}`,
					date: new Date().toISOString().split("T")[0],
					advisor: comm.advisorName,
					type: "released",
					amount: comm.totalAmount - comm.paidAmount,
					balance: comm.totalAmount - comm.paidAmount,
					desc: `Released commission hold on ${comm.projectName}`
				},
				...prev
			]);
			toast.success(`Commission hold released for ${comm.advisorName}`);
		} else {
			// Open hold modal
			setSelectedComm(comm);
			setHoldModalOpen(true);
		}
	};

	const submitHold = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedComm) return;

		setCommissions(prev => prev.map(c => c.id === selectedComm.id ? { ...c, holdStatus: true, holdReason: holdReason as any, holdNotes } : c));
		setLedgerLogs(prev => [
			{
				id: `ledg-${Date.now()}`,
				date: new Date().toISOString().split("T")[0],
				advisor: selectedComm.advisorName,
				type: "held",
				amount: -(selectedComm.totalAmount - selectedComm.paidAmount),
				balance: 0,
				desc: `Commission held: ${holdReason.replace("_", " ")}. Notes: ${holdNotes}`
			},
			...prev
		]);

		setHoldModalOpen(false);
		setHoldNotes("");
		toast.success(`Commission placed on hold for ${selectedComm.advisorName}`);
	};

	// Toggle Auto Calculate
	const handleToggleAutoCalc = (id: string) => {
		setCommissions(prev => prev.map(c => c.id === id ? { ...c, autoCalculated: !c.autoCalculated } : c));
		toast.success("Toggled auto-calculated configuration");
	};

	// Handle Expense Approval
	const handleExpenseApproval = (exp: any, newStatus: "approved" | "rejected") => {
		setSelectedExp(exp);
		setExpenseActionOpen(true);
	};

	const submitExpenseAction = (status: "approved" | "rejected") => {
		if (!selectedExp) return;

		setExpenses(prev => prev.map(e => e.id === selectedExp.id ? { ...e, status, approvedBy: "Admin Kumar", approvedAt: new Date().toISOString().split("T")[0], note: actionNotes } : e));
		setExpenseActionOpen(false);
		setActionNotes("");
		toast.success(`Expense successfully marked as ${status}`);
	};

	// Handle Leave Request
	const handleLeaveAction = (leave: any, newStatus: "approved" | "rejected") => {
		setSelectedLeave(leave);
		if (newStatus === "approved") {
			setLeaves(prev => prev.map(l => l.id === leave.id ? { ...l, status: "approved", approvedBy: "Admin Kumar", approvedAt: new Date().toISOString().split("T")[0] } : l));
			toast.success(`Leave approved for ${leave.employeeName}`);
		} else {
			setLeaveActionOpen(true);
		}
	};

	const submitLeaveReject = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedLeave) return;

		setLeaves(prev => prev.map(l => l.id === selectedLeave.id ? { ...l, status: "rejected", rejectReason: leaveRejectReason } : l));
		setLeaveActionOpen(false);
		setLeaveRejectReason("");
		toast.success(`Leave rejected for ${selectedLeave.employeeName}`);
	};

	// Post Announcement
	const submitAnnouncement = (e: React.FormEvent) => {
		e.preventDefault();
		const newAnn = {
			id: `ann-${Date.now()}`,
			title: annTitle,
			body: annBody,
			type: annType,
			targetRoles: ["sales", "advisor"],
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
			pinned: false,
			reads: 0
		};
		setAnnouncements(prev => [newAnn, ...prev]);
		setAnnouncementModalOpen(false);
		setAnnTitle("");
		setAnnBody("");
		toast.success("Internal announcement published successfully!");
	};

	// Trigger Report Export
	const handleTriggerExport = (type: string, format: string) => {
		setExportingType(type);
		const newExport = {
			id: `rep-${Date.now()}`,
			type,
			format: format as any,
			filters: "Active session client scope",
			generatedBy: "Admin Kumar",
			rowCount: Math.floor(Math.random() * 100) + 15,
			status: "pending",
			date: new Date().toISOString().split("T")[0]
		};
		setReports(prev => [newExport, ...prev]);

		// Simulate completion
		setTimeout(() => {
			setReports(prev => prev.map(r => r.id === newExport.id ? { ...r, status: "completed" } : r));
			toast.success(`${type} (${format.toUpperCase()}) exported successfully!`);
			setExportingType("");
		}, 3000);
	};

	// Trigger Legal Escalation
	const handleOpenEscalation = (recov: any) => {
		setSelectedRecoveryCustomer(recov);
		setNoticeRef(`NOT-${new Date().getFullYear()}-${recov.plotNo}`);
		setEscalationDrawerOpen(true);
	};

	const submitLegalEscalation = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedRecoveryCustomer) return;

		const newEsc: LegalEscalationItem = {
			id: `leg-${Date.now()}`,
			customerName: selectedRecoveryCustomer.customerName,
			legalStage: "notice_sent",
			totalOverdue: selectedRecoveryCustomer.overdueAmount,
			noticeDate: new Date().toISOString().split("T")[0],
			lawyerName,
			lawyerContact,
			courtDate: null,
			contact: lawyerContact,
			notes: escalationNotes,
			caseNumber: noticeRef
		};

		setEscalations(prev => [newEsc, ...prev]);
		setRecoveryList(prev => prev.map(r => r.id === selectedRecoveryCustomer.id ? { ...r, stage: "legal_notice" } : r));
		setEscalationDrawerOpen(false);
		setLawyerName("");
		setLawyerContact("");
		setEscalationNotes("");
		toast.success(`Legal notice issued for ${selectedRecoveryCustomer.customerName}`);
	};

	// Toggle Permission checkbox
	const handlePermissionToggle = (role: string, module: string, action: "view" | "create" | "edit" | "delete" | "export") => {
		setPermissions(prev => {
			const index = prev.findIndex(p => p.roleName === role && p.moduleKey === module);
			if (index > -1) {
				const updated = [...prev];
				updated[index] = { ...updated[index], [action]: !updated[index][action] };
				return updated;
			} else {
				return [...prev, { roleName: role, moduleKey: module, view: false, create: false, edit: false, delete: false, export: false, [action]: true }];
			}
		});
		toast.success(`Updated permissions for ${role} on ${module}`);
	};

	return (
		<div className={`${darkMode ? "dark bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-900"} min-h-screen transition-colors duration-300 font-sans flex flex-col`}>
			{/* Inner Unified Shell Layout */}
			<div className="flex-1 flex flex-col lg:flex-row">
				{/* Secondary Modules Nav Sub-sidebar */}
				<div className="w-full lg:w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
					<div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
						<div className="flex items-center gap-2">
							<FolderCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
							<span className="font-bold tracking-tight text-sm uppercase text-zinc-500 dark:text-zinc-400">Upgraded Modules</span>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="rounded-full w-8 h-8 hover:bg-zinc-100 dark:hover:bg-zinc-800"
							onClick={() => setDarkMode(!darkMode)}
							title="Toggle Dark/Light Mode"
						>
							{darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-zinc-500" />}
						</Button>
					</div>

					<nav className="flex-1 p-3 space-y-1">
						{[
							{ id: "commissions", label: "Commissions", icon: Coins, key: "Module 10" },
							{ id: "expenses", label: "Expense Approvals", icon: Receipt, key: "Module 11" },
							{ id: "messaging", label: "Announcements & Chats", icon: Bell, key: "Module 12" },
							{ id: "hr", label: "HR Leave Console", icon: UserCheck, key: "Module 13" },
							{ id: "reports", label: "Reports Export", icon: FileSpreadsheet, key: "Module 14" },
							{ id: "recovery", label: "Debt Recovery & Legal", icon: ShieldAlert, key: "Module 15" },
							{ id: "settings", label: "Business Config", icon: Settings, key: "Module 17" },
							{ id: "permissions", label: "Role Permissions", icon: Lock, key: "Module 17" }
						].map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									onClick={() => {
										setActiveTab(tab.id as any);
										setSearchQuery("");
									}}
									className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
										isActive
											? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white shadow-sm"
											: "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60"
									}`}
								>
									<div className="flex items-center gap-2.5">
										<Icon className={`h-4 w-4 ${isActive ? "text-indigo-400" : "text-zinc-400"}`} />
										<span>{tab.label}</span>
									</div>
									<span className="text-[9px] uppercase opacity-60 font-mono">{tab.key}</span>
								</button>
							);
						})}
					</nav>
				</div>

				{/* Primary Content Console */}
				<div className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">

					{/* 1. COMMISSIONS TAB */}
					{activeTab === "commissions" && (
						<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
								<div>
									<h2 className="text-xl font-bold tracking-tight">Commissions Control Panel</h2>
									<p className="text-xs text-zinc-500">Manage hold releases, sub-advisor splits, and payouts ledger</p>
								</div>
								<div className="relative w-64">
									<Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
									<Input
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search advisor name..."
										className="pl-9 h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
									/>
								</div>
							</div>

							{/* Summary metrics row */}
							<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Total Commission volume</p>
										<p className="text-xl font-bold text-zinc-800 dark:text-zinc-150 mt-1">{formatCurrency(commissionsStats.total)}</p>
									</CardContent>
								</Card>
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Paid Amount</p>
										<p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(commissionsStats.paid)}</p>
									</CardContent>
								</Card>
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">On Hold</p>
										<p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(commissionsStats.held)}</p>
									</CardContent>
								</Card>
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Active Commission Cases</p>
										<p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{commissionsStats.count} records</p>
									</CardContent>
								</Card>
							</div>

							{/* Commissions Roster */}
							<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
								<div className="p-4 border-b border-zinc-100 dark:border-zinc-850 font-bold text-xs uppercase tracking-wider">Commissions Roster</div>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Advisor</TableHead>
												<TableHead>Project / Sale Details</TableHead>
												<TableHead className="text-right">Total Commission</TableHead>
												<TableHead className="text-right">Paid Amount</TableHead>
												<TableHead>Sub-Advisor Split</TableHead>
												<TableHead>Auto-Calc</TableHead>
												<TableHead>Hold Status</TableHead>
												<TableHead className="text-right">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{commissions
												.filter(c => c.advisorName.toLowerCase().includes(searchQuery.toLowerCase()))
												.map((comm) => (
													<TableRow key={comm.id}>
														<TableCell className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{comm.advisorName}</TableCell>
														<TableCell>
															<div className="text-xs text-zinc-700 dark:text-zinc-300">{comm.projectName}</div>
															<div className="text-[10px] text-zinc-400 font-mono mt-0.5">{comm.createdAt}</div>
														</TableCell>
														<TableCell className="text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatCurrency(comm.totalAmount)}</TableCell>
														<TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(comm.paidAmount)}</TableCell>
														<TableCell>
															{comm.subAdvisorName ? (
																<div>
																	<div className="text-xs font-semibold">{comm.subAdvisorName}</div>
																	<Badge variant="outline" className="text-[10px] py-0 px-1 mt-0.5 border-indigo-200 text-indigo-700 bg-indigo-50/10">
																		Split: {comm.subAdvisorSplitPct}%
																	</Badge>
																</div>
															) : (
																<span className="text-xs text-zinc-400 italic">No split</span>
															)}
														</TableCell>
														<TableCell>
															<button onClick={() => handleToggleAutoCalc(comm.id)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${comm.autoCalculated ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-700"}`}>
																<span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${comm.autoCalculated ? "translate-x-4" : "translate-x-0"}`} />
															</button>
														</TableCell>
														<TableCell>
															{comm.holdStatus ? (
																<div className="flex flex-col gap-1 items-start">
																	<Badge className="bg-red-50 text-red-700 border-red-200 font-normal">
																		On Hold
																	</Badge>
																	<span className="text-[9px] text-red-500 font-medium capitalize">{comm.holdReason?.replace("_", " ")}</span>
																</div>
															) : (
																<Badge className="bg-green-50 text-green-700 border-green-200 font-normal">
																	Released / Active
																</Badge>
															)}
														</TableCell>
														<TableCell className="text-right">
															<Button
																size="xs"
																variant="outline"
																className={comm.holdStatus ? "text-green-600 border-green-200 bg-green-50/10 hover:bg-green-50" : "text-red-600 border-red-250 bg-red-50/10 hover:bg-red-50"}
																onClick={() => handleHoldAction(comm)}
															>
																{comm.holdStatus ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
																{comm.holdStatus ? "Release" : "Place Hold"}
															</Button>
														</TableCell>
													</TableRow>
												))}
										</TableBody>
									</Table>
								</div>
							</Card>

							{/* Ledger Log */}
							<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
								<div className="p-4 border-b border-zinc-100 dark:border-zinc-850 font-bold text-xs uppercase tracking-wider">Commission Ledger Transactions</div>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Date</TableHead>
												<TableHead>Advisor</TableHead>
												<TableHead>Transaction Type</TableHead>
												<TableHead className="text-right">Ledger Amount</TableHead>
												<TableHead>Description / Reference</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{ledgerLogs.map((log) => {
												let badgeColor = "bg-zinc-100 text-zinc-800 border-zinc-200";
												if (log.type === "earned" || log.type === "released") {
													badgeColor = "bg-green-50 text-green-700 border-green-200";
												} else if (log.type === "held") {
													badgeColor = "bg-red-50 text-red-700 border-red-200";
												} else if (log.type === "paid") {
													badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
												}
												return (
													<TableRow key={log.id}>
														<TableCell className="font-mono text-xs text-zinc-500">{log.date}</TableCell>
														<TableCell className="font-medium text-xs text-zinc-800 dark:text-zinc-200">{log.advisor}</TableCell>
														<TableCell>
															<Badge variant="outline" className={`font-normal uppercase text-[9px] ${badgeColor}`}>
																{log.type}
															</Badge>
														</TableCell>
														<TableCell className={`text-right font-mono font-bold text-xs ${log.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
															{formatCurrency(log.amount)}
														</TableCell>
														<TableCell className="text-xs text-zinc-600 dark:text-zinc-400">{log.desc}</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							</Card>
						</div>
					)}

					{/* 2. EXPENSES TAB */}
					{activeTab === "expenses" && (
						<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
								<div>
									<h2 className="text-xl font-bold tracking-tight">Office Expense Approvals</h2>
									<p className="text-xs text-zinc-500">Monitor expenditure approvals, vendors bills, and transaction flow</p>
								</div>
								<div className="relative w-64">
									<Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
									<Input
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search description/vendor..."
										className="pl-9 h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
									/>
								</div>
							</div>

							{/* Summary metrics row */}
							<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Awaiting Approval</p>
										<p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(expensesStats.pending)}</p>
									</CardContent>
								</Card>
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Approved / Paid Volume</p>
										<p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(expensesStats.approved)}</p>
									</CardContent>
								</Card>
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Rejected Requests</p>
										<p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(expensesStats.rejected)}</p>
									</CardContent>
								</Card>
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Total Claims Logged</p>
										<p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{expensesStats.count} bills</p>
									</CardContent>
								</Card>
							</div>

							{/* Claims Table */}
							<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
								<div className="p-4 border-b border-zinc-100 dark:border-zinc-850 font-bold text-xs uppercase tracking-wider">Expense Claims Ledger</div>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Claim Details</TableHead>
												<TableHead>Date / Project</TableHead>
												<TableHead className="text-right">Claim Amount</TableHead>
												<TableHead>Vendor & Invoice</TableHead>
												<TableHead>Bill Attachment</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="text-right">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{expenses
												.filter(e => e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.vendor.toLowerCase().includes(searchQuery.toLowerCase()))
												.map((exp) => {
													let statusBadge = "bg-zinc-100 text-zinc-800 border-zinc-200";
													if (exp.status === "pending") statusBadge = "bg-amber-50 text-amber-700 border-amber-250";
													else if (exp.status === "approved") statusBadge = "bg-green-50 text-green-700 border-green-200";
													else if (exp.status === "paid") statusBadge = "bg-emerald-50 text-emerald-800 border-emerald-250";
													else if (exp.status === "rejected") statusBadge = "bg-red-50 text-red-700 border-red-200";

													return (
														<TableRow key={exp.id}>
															<TableCell className="max-w-xs">
																<div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{exp.description}</div>
																<div className="text-[10px] text-zinc-400 font-mono mt-0.5">{exp.category}</div>
															</TableCell>
															<TableCell>
																<div className="text-xs text-zinc-700 dark:text-zinc-300 font-mono">{exp.date}</div>
																<div className="text-[10px] text-zinc-400 mt-0.5">{exp.project}</div>
															</TableCell>
															<TableCell className="text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatCurrency(exp.amount)}</TableCell>
															<TableCell>
																<div className="text-xs font-semibold">{exp.vendor}</div>
																<div className="text-[10px] text-zinc-400 font-mono mt-0.5">Inv: {exp.invoice}</div>
															</TableCell>
															<TableCell>
																<Button size="xs" variant="ghost" className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 p-0 h-auto" onClick={() => toast.info(`Viewing Bill attachment: /storage/bills/${exp.invoice.toLowerCase()}.pdf`)}>
																	<FileText className="h-3.5 w-3.5" />
																	<span>View Bill</span>
																</Button>
															</TableCell>
															<TableCell>
																<Badge variant="outline" className={`font-normal uppercase text-[9px] ${statusBadge}`}>
																	{exp.status}
																</Badge>
															</TableCell>
															<TableCell className="text-right">
																{exp.status === "pending" ? (
																	<div className="flex gap-1 justify-end">
																		<Button size="xs" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleExpenseApproval(exp, "approved")}>Approve</Button>
																		<Button size="xs" variant="outline" className="text-red-600 border-red-200 bg-red-50/10 hover:bg-red-50" onClick={() => handleExpenseApproval(exp, "rejected")}>Reject</Button>
																	</div>
																) : (
																	<div className="text-[10px] text-zinc-500 italic">
																		{exp.status === "approved" || exp.status === "paid" ? `Approved by ${exp.approvedBy}` : `Rejected: ${exp.note}`}
																	</div>
																)}
															</TableCell>
														</TableRow>
													);
												})}
										</TableBody>
									</Table>
								</div>
							</Card>

							{/* Expense Approvals Audit Timeline */}
							<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5 space-y-4">
								<h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Expense Approval Logs & Workflow Timeline</h3>
								<div className="relative pl-4 border-l border-zinc-200 dark:border-zinc-700 space-y-4">
									{expenses.filter(e => e.approvedBy).map((exp) => (
										<div key={exp.id} className="relative space-y-0.5 text-xs">
											<div className="absolute -left-[20px] top-1.5 h-2 w-2 rounded-full bg-emerald-500 border border-white dark:border-zinc-900" />
											<div className="flex justify-between items-center text-[10px] text-zinc-400">
												<span>Actioned By: {exp.approvedBy}</span>
												<span>{exp.approvedAt}</span>
											</div>
											<p className="font-medium text-zinc-700 dark:text-zinc-350">
												Expense: <span className="font-semibold text-zinc-800 dark:text-zinc-200">₹{exp.amount.toLocaleString()}</span> for &quot;{exp.description}&quot; was marked as <span className="font-semibold text-emerald-600 capitalize">{exp.status}</span>.
											</p>
											{exp.note && <p className="text-[10px] italic text-zinc-400">Audit notes: &quot;{exp.note}&quot;</p>}
										</div>
									))}
								</div>
							</Card>
						</div>
					)}

					{/* 3. MESSAGING TAB */}
					{activeTab === "messaging" && (
						<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
								<div>
									<h2 className="text-xl font-bold tracking-tight">Internal Announcements & Reminders</h2>
									<p className="text-xs text-zinc-500">Post announcements, track reading analytics, and review WhatsApp share logs</p>
								</div>
								<Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow" onClick={() => setAnnouncementModalOpen(true)}>
									<Plus className="h-4 w-4 mr-1.5" /> Publish Announcement
								</Button>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Announcements Feed */}
								<div className="space-y-4">
									<h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Internal Announcements</h3>
									{announcements.map((ann) => (
										<Card key={ann.id} className={`bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-800/80 shadow-sm relative overflow-hidden ${ann.pinned ? "border-l-4 border-l-amber-500" : ""}`}>
											<CardContent className="p-4 space-y-2">
												<div className="flex justify-between items-start">
													<div>
														<h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-150 flex items-center gap-1.5">
															{ann.title}
															{ann.pinned && <span className="text-[9px] uppercase font-bold text-amber-800 bg-amber-100/60 px-1 rounded">Pinned</span>}
														</h4>
														<p className="text-[10px] text-zinc-400 font-mono mt-0.5">Expires: {ann.expiresAt} • Type: <span className="capitalize">{ann.type}</span></p>
													</div>
													<div className="flex items-center gap-1 text-[10px] text-zinc-400">
														<Eye className="h-3.5 w-3.5" />
														<span>{ann.reads} reads</span>
													</div>
												</div>
												<p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{ann.body}</p>
												<div className="flex flex-wrap gap-1 mt-2">
													{ann.targetRoles.map(role => (
														<Badge key={role} className="bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-750 text-[9px] font-normal uppercase">
															{role}
														</Badge>
													))}
												</div>
											</CardContent>
										</Card>
									))}
								</div>

								{/* Reminders & Log */}
								<div className="space-y-4">
									<div className="flex justify-between items-center">
										<h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Reminders Logs</h3>
										<select
											value={reminderFilter}
											onChange={(e) => setReminderFilter(e.target.value)}
											className="text-xs border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded p-1"
										>
											<option value="all">All Reminders</option>
											<option value="sent">Sent</option>
											<option value="pending">Pending</option>
										</select>
									</div>

									<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
										<div className="overflow-x-auto">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Reminder Title</TableHead>
														<TableHead>Customer</TableHead>
														<TableHead>Status</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{reminders
														.filter(r => reminderFilter === "all" ? true : reminderFilter === "sent" ? r.isSent : !r.isSent)
														.map((rem) => (
															<TableRow key={rem.id}>
																<TableCell className="max-w-xs">
																	<div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{rem.title}</div>
																	<div className="text-[10px] text-zinc-400 font-mono mt-0.5">{rem.date}</div>
																</TableCell>
																<TableCell>
																	<div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{rem.customerName}</div>
																	<div className="text-[10px] text-zinc-400 font-mono mt-0.5">{rem.phone}</div>
																</TableCell>
																<TableCell>
																	{rem.isSent ? (
																		<div className="flex flex-col items-start gap-0.5">
																			<Badge className="bg-green-50 text-green-700 border-green-200 font-normal">
																				Sent
																			</Badge>
																			<span className="text-[9px] text-zinc-400 font-mono mt-0.5">{rem.sentAt}</span>
																		</div>
																	) : (
																		<Badge className="bg-yellow-50 text-yellow-800 border-yellow-200 font-normal">
																			Pending Queue
																		</Badge>
																	)}
																</TableCell>
															</TableRow>
														))}
												</TableBody>
											</Table>
										</div>
									</Card>
								</div>
							</div>

							{/* WhatsApp Share Log Table */}
							<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
								<div className="p-4 border-b border-zinc-100 dark:border-zinc-850 font-bold text-xs uppercase tracking-wider flex justify-between items-center">
									<span>WhatsApp Share Log</span>
									<span className="text-[9px] text-zinc-400 uppercase tracking-widest">Sent via app client Integration</span>
								</div>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Shared By</TableHead>
												<TableHead>Recipient</TableHead>
												<TableHead>Template Type</TableHead>
												<TableHead>Message Payload</TableHead>
												<TableHead>Sent At</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{whatsappLogs.map((log) => (
												<TableRow key={log.id}>
													<TableCell className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{log.sharedBy}</TableCell>
													<TableCell>
														<div className="text-xs font-semibold">{log.customerName}</div>
														<div className="text-[10px] text-zinc-400 font-mono mt-0.5">{log.phone}</div>
													</TableCell>
													<TableCell>
														<Badge variant="outline" className="text-[9px] font-normal uppercase bg-green-50/10 text-green-700 border-green-200">
															{log.type.replace("_", " ")}
														</Badge>
													</TableCell>
													<TableCell className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm truncate" title={log.message}>
														&quot;{log.message}&quot;
													</TableCell>
													<TableCell className="font-mono text-xs text-zinc-400">{log.sharedAt}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</Card>
						</div>
					)}

					{/* 4. HR MANAGEMENT TAB */}
					{activeTab === "hr" && (
						<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
								<div>
									<h2 className="text-xl font-bold tracking-tight">HR Leave Request approvals</h2>
									<p className="text-xs text-zinc-500">Monitor employee attendances, department designations, and leave pipelines</p>
								</div>
								<div className="relative w-64">
									<Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
									<Input
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search employee name..."
										className="pl-9 h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								{/* Employee Roster */}
								<div className="lg:col-span-2 space-y-4">
									<h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Staff Directory</h3>
									<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
										<div className="overflow-x-auto">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Code</TableHead>
														<TableHead>Employee Name</TableHead>
														<TableHead>Role & Department</TableHead>
														<TableHead>Joining Date</TableHead>
														<TableHead>Status</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{employees
														.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
														.map((emp) => (
															<TableRow key={emp.id}>
																<TableCell className="font-mono text-xs text-zinc-500">{emp.code}</TableCell>
																<TableCell>
																	<div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{emp.name}</div>
																	<div className="text-[10px] text-zinc-400 font-mono mt-0.5">{emp.email} • {emp.phone}</div>
																</TableCell>
																<TableCell>
																	<div className="text-xs text-zinc-700 dark:text-zinc-300">{emp.role}</div>
																	<div className="text-[10px] text-zinc-400 mt-0.5">{emp.department}</div>
																</TableCell>
																<TableCell className="text-xs font-mono text-zinc-500">{emp.joiningDate}</TableCell>
																<TableCell>
																	<Badge className="bg-green-50 text-green-700 border-green-200 font-normal">
																		{emp.status}
																	</Badge>
																</TableCell>
															</TableRow>
														))}
												</TableBody>
											</Table>
										</div>
									</Card>
								</div>

								{/* Department Management Panel */}
								<div className="space-y-4">
									<h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Department Segments</h3>
									<Card className="bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-800/80 shadow-sm p-4 space-y-4">
										{[
											{ name: "Sales & Marketing", head: "Vikram Rathore", count: 4 },
											{ name: "Finance & Accounts", head: "Ananya Deshmukh", count: 2 },
											{ name: "Customer Support & Recovery", head: "Siddharth Sen", count: 3 }
										].map((dept) => (
											<div key={dept.name} className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
												<div>
													<h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-150">{dept.name}</h4>
													<p className="text-[10px] text-zinc-400 mt-0.5">Head: {dept.head}</p>
												</div>
												<Badge variant="outline" className="font-mono text-[10px] text-indigo-700 border-indigo-200 bg-indigo-50/10">
													{dept.count} members
												</Badge>
											</div>
										))}
										<Button size="xs" variant="outline" className="w-full font-semibold border-zinc-200 text-zinc-600 mt-2" onClick={() => toast.success("Opening Department Manager Editor")}>
											Edit Departments
										</Button>
									</Card>
								</div>
							</div>

							{/* Leave Requests approvals Queue */}
							<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
								<div className="p-4 border-b border-zinc-100 dark:border-zinc-850 font-bold text-xs uppercase tracking-wider">Leave Applications Queue</div>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Employee Name</TableHead>
												<TableHead>Leave Dates (From - To)</TableHead>
												<TableHead className="text-center">Days</TableHead>
												<TableHead>Leave Type</TableHead>
												<TableHead>Reason</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="text-right">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{leaves.map((leave) => {
												let badgeColor = "bg-zinc-100 text-zinc-800 border-zinc-200";
												if (leave.status === "approved") badgeColor = "bg-green-50 text-green-700 border-green-200";
												else if (leave.status === "rejected") badgeColor = "bg-red-50 text-red-700 border-red-200";
												else if (leave.status === "pending") badgeColor = "bg-amber-50 text-amber-700 border-amber-250";

												return (
													<TableRow key={leave.id}>
														<TableCell className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{leave.employeeName}</TableCell>
														<TableCell className="font-mono text-xs text-zinc-500">{leave.leaveFrom} → {leave.leaveTo}</TableCell>
														<TableCell className="text-center font-semibold font-mono text-xs">{leave.days} days</TableCell>
														<TableCell className="capitalize text-xs font-semibold">{leave.leaveType} leave</TableCell>
														<TableCell className="text-xs text-zinc-650 max-w-xs">{leave.reason}</TableCell>
														<TableCell>
															<Badge variant="outline" className={`font-normal uppercase text-[9px] ${badgeColor}`}>
																{leave.status}
															</Badge>
														</TableCell>
														<TableCell className="text-right">
															{leave.status === "pending" ? (
																<div className="flex gap-1 justify-end">
																	<Button size="xs" className="bg-green-600 hover:bg-green-700 text-white font-medium" onClick={() => handleLeaveAction(leave, "approved")}>Approve</Button>
																	<Button size="xs" variant="outline" className="text-red-600 border-red-200 bg-red-50/10 hover:bg-red-50" onClick={() => handleLeaveAction(leave, "rejected")}>Reject</Button>
																</div>
															) : (
																<div className="text-[10px] text-zinc-400 italic">
																	{leave.status === "approved" ? `Approved by ${leave.approvedBy}` : `Rejected: ${leave.rejectReason}`}
																</div>
															)}
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							</Card>
						</div>
					)}

					{/* 5. REPORTS TAB */}
					{activeTab === "reports" && (
						<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<div>
								<h2 className="text-xl font-bold tracking-tight">Reports & Export Queue</h2>
								<p className="text-xs text-zinc-500">Generate and download financial metrics, invoices summary, and tax registers</p>
							</div>

							{/* Generation selection cards */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								{[
									{ title: "Monthly Sales & Registries", desc: "Consolidated list of bookings, plot bookings, payments, and discounts.", type: "Monthly Sales Report" },
									{ title: "Advisors Commissions & Ledger", desc: "Payout details, hold status log, and running commission balances.", type: "Advisors Payout Summary" },
									{ title: "Consolidated Expense Ledger", desc: "Project infrastructure layout costs, audits logs, and vendor invoices.", type: "Consolidated Expense Ledger" }
								].map((card) => (
									<Card key={card.title} className="bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-800/80 shadow-sm p-5 space-y-4 hover:shadow-md hover:border-zinc-350 dark:hover:border-zinc-700 transition-all">
										<div>
											<h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-150">{card.title}</h4>
											<p className="text-xs text-zinc-500 mt-1 leading-relaxed">{card.desc}</p>
										</div>
										<div className="flex gap-2">
											<Button size="xs" variant="outline" className="flex-1 flex items-center justify-center gap-1 border-indigo-250 text-indigo-700 dark:text-indigo-400" onClick={() => handleTriggerExport(card.type, "excel")}>
												<FileSpreadsheet className="h-3.5 w-3.5" />
												<span>Excel</span>
											</Button>
											<Button size="xs" variant="outline" className="flex-1 flex items-center justify-center gap-1 border-rose-250 text-rose-700 dark:text-rose-400" onClick={() => handleTriggerExport(card.type, "pdf")}>
												<FileText className="h-3.5 w-3.5" />
												<span>PDF</span>
											</Button>
											<Button size="xs" variant="outline" className="flex-1 flex items-center justify-center gap-1 border-zinc-300 text-zinc-600" onClick={() => handleTriggerExport(card.type, "csv")}>
												<Download className="h-3.5 w-3.5" />
												<span>CSV</span>
											</Button>
										</div>
									</Card>
								))}
							</div>

							{/* Export Logs Table */}
							<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
								<div className="p-4 border-b border-zinc-100 dark:border-zinc-850 font-bold text-xs uppercase tracking-wider">Reports Generation Queue</div>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Export Document</TableHead>
												<TableHead>Format</TableHead>
												<TableHead>Scope Filters</TableHead>
												<TableHead>Generated By</TableHead>
												<TableHead className="text-center">Row Count</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="text-right">Download</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{reports.map((rep) => {
												let statusBadge = "bg-green-50 text-green-700 border-green-200";
												let formatBadge = "bg-indigo-50 text-indigo-700 border-indigo-200";
												if (rep.format === "pdf") formatBadge = "bg-rose-50 text-rose-700 border-rose-200";
												else if (rep.format === "csv") formatBadge = "bg-zinc-100 text-zinc-700 border-zinc-200";

												if (rep.status === "pending") statusBadge = "bg-amber-50 text-amber-700 border-amber-250";

												return (
													<TableRow key={rep.id}>
														<TableCell>
															<div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{rep.type}</div>
															<div className="text-[10px] text-zinc-400 font-mono mt-0.5">{rep.date}</div>
														</TableCell>
														<TableCell>
															<Badge variant="outline" className={`font-normal uppercase text-[9px] ${formatBadge}`}>
																{rep.format}
															</Badge>
														</TableCell>
														<TableCell className="text-xs text-zinc-600 dark:text-zinc-400">{rep.filters}</TableCell>
														<TableCell className="text-xs font-medium text-zinc-700 dark:text-zinc-350">{rep.generatedBy}</TableCell>
														<TableCell className="text-center font-mono font-semibold text-xs">{rep.rowCount ? `${rep.rowCount} rows` : "—"}</TableCell>
														<TableCell>
															{rep.status === "pending" ? (
																<div className="flex flex-col gap-1 w-24">
																	<div className="flex justify-between items-center text-[9px] text-zinc-400">
																		<span>Compiling...</span>
																	</div>
																	<div className="h-1 w-full bg-zinc-100 rounded overflow-hidden">
																		<div className="h-full bg-amber-500 animate-pulse" style={{ width: "60%" }} />
																	</div>
																</div>
															) : (
																<Badge className={`font-normal uppercase text-[9px] ${statusBadge}`}>
																	{rep.status}
																</Badge>
															)}
														</TableCell>
														<TableCell className="text-right">
															<Button
																size="xs"
																variant="ghost"
																disabled={rep.status === "pending"}
																className="text-indigo-650 hover:text-indigo-700 p-0 h-auto"
																onClick={() => toast.success(`Downloading sheet_${rep.id.toLowerCase()}.${rep.format}`)}
															>
																<Download className="h-4 w-4" />
															</Button>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							</Card>
						</div>
					)}

					{/* 6. RECOVERY TAB */}
					{activeTab === "recovery" && (
						<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
								<div>
									<h2 className="text-xl font-bold tracking-tight">Debt Recovery & Legal Escalations</h2>
									<p className="text-xs text-zinc-500">Track outstanding overdue amounts, log collection calls, and issue legal notices</p>
								</div>
								<div className="relative w-64">
									<Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
									<Input
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search customer name..."
										className="pl-9 h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
									/>
								</div>
							</div>

							{/* Summary metrics row */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Consolidated Outstanding Debt</p>
										<p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(recoveryStats.totalOverdue)}</p>
									</CardContent>
								</Card>
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Legal Notices / Cases Filed</p>
										<p className="text-xl font-bold text-red-800 dark:text-red-500 mt-1">{recoveryStats.legalCases} active cases</p>
									</CardContent>
								</Card>
								<Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/80 shadow-sm">
									<CardContent className="p-4">
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Active Promises to Pay</p>
										<p className="text-xl font-bold text-emerald-600 mt-1">{recoveryStats.activePromises} pending</p>
									</CardContent>
								</Card>
							</div>

							{/* Recovery List */}
							<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
								<div className="p-4 border-b border-zinc-100 dark:border-zinc-850 font-bold text-xs uppercase tracking-wider">Overdue Accounts Ledger</div>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Customer</TableHead>
												<TableHead>Unit / Plot</TableHead>
												<TableHead className="text-center">Overdue EMIs</TableHead>
												<TableHead className="text-right">Total Overdue</TableHead>
												<TableHead className="text-center">Max delay</TableHead>
												<TableHead>Recovery Stage</TableHead>
												<TableHead className="text-right">Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{recoveryList
												.filter(r => r.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
												.map((recov) => {
													let stageBadge = "bg-zinc-50 text-zinc-600 border-zinc-200";
													if (recov.stage === "reminder") stageBadge = "bg-yellow-50 text-yellow-800 border-yellow-250";
													else if (recov.stage === "follow_up") stageBadge = "bg-orange-50 text-orange-700 border-orange-250";
													else if (recov.stage === "warning") stageBadge = "bg-red-50 text-red-700 border-red-200";
													else if (recov.stage === "legal_notice") stageBadge = "bg-red-100 text-red-800 border-red-300";

													return (
														<TableRow key={recov.id}>
															<TableCell>
																<div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{recov.customerName}</div>
																<div className="text-[10px] text-zinc-400 font-mono mt-0.5">{recov.phone}</div>
															</TableCell>
															<TableCell>
																<div className="text-xs text-zinc-700 dark:text-zinc-300">Plot {recov.plotNo}</div>
																<div className="text-[10px] text-zinc-400 mt-0.5">{recov.project}</div>
															</TableCell>
															<TableCell className="text-center font-semibold font-mono text-xs">{recov.overdueEmis} EMIs</TableCell>
															<TableCell className="text-right font-mono font-bold text-red-650 dark:text-red-400">{formatCurrency(recov.overdueAmount)}</TableCell>
															<TableCell className="text-center font-mono font-semibold text-xs">{recov.delayDays} days</TableCell>
															<TableCell>
																<Badge variant="outline" className={`font-normal uppercase text-[9px] ${stageBadge}`}>
																	{recov.stage.replace("_", " ")}
																</Badge>
															</TableCell>
															<TableCell className="text-right">
																{recov.stage !== "legal_notice" && (
																	<Button size="xs" variant="outline" className="text-red-750 border-red-200 bg-red-50/10 hover:bg-red-55" onClick={() => handleOpenEscalation(recov)}>
																		Escalate to Legal
																	</Button>
																)}
															</TableCell>
														</TableRow>
													);
												})}
										</TableBody>
									</Table>
								</div>
							</Card>

							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Promise to Pay Panel */}
								<div className="space-y-4">
									<h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Promise to Pay Registry</h3>
									<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
										<div className="overflow-x-auto">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Customer</TableHead>
														<TableHead className="text-right">Promised Amount</TableHead>
														<TableHead>Target Date</TableHead>
														<TableHead>Status</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{promises.map((prom) => {
														let statusBadge = "bg-amber-50 text-amber-700 border-amber-250";
														if (prom.status === "kept") statusBadge = "bg-green-50 text-green-700 border-green-200";
														else if (prom.status === "broken") statusBadge = "bg-red-50 text-red-700 border-red-200";

														return (
															<TableRow key={prom.id}>
																<TableCell>
																	<div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{prom.customerName}</div>
																	<div className="text-[10px] text-zinc-400 mt-0.5 max-w-xxs truncate">&quot;{prom.notes}&quot;</div>
																</TableCell>
																<TableCell className="text-right font-mono font-bold text-xs">{formatCurrency(prom.promisedAmount)}</TableCell>
																<TableCell className="text-xs font-mono font-medium text-zinc-500">{prom.promisedDate}</TableCell>
																<TableCell>
																	<Badge variant="outline" className={`font-normal uppercase text-[9px] ${statusBadge}`}>
																		{prom.status}
																	</Badge>
																</TableCell>
															</TableRow>
														);
													})}
												</TableBody>
											</Table>
										</div>
									</Card>
								</div>

								{/* Legal Cases Panel */}
								<div className="space-y-4">
									<h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Legal Action Escalation logs</h3>
									<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
										<div className="overflow-x-auto">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Defaulter Customer</TableHead>
														<TableHead>Legal Details</TableHead>
														<TableHead className="text-right font-medium">Overdue Amount</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{escalations.map((esc) => (
														<TableRow key={esc.id}>
															<TableCell className="font-semibold text-xs text-zinc-850 dark:text-zinc-150">{esc.customerName}</TableCell>
															<TableCell>
																<div className="text-xs text-zinc-800 dark:text-zinc-200">{esc.lawyerName} ({esc.contact})</div>
																<div className="text-[10px] text-zinc-400 mt-0.5">Notice: {esc.caseNumber} • {esc.noticeDate}</div>
															</TableCell>
															<TableCell className="text-right font-mono font-bold text-red-600">{formatCurrency(esc.totalOverdue)}</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									</Card>
								</div>
							</div>
						</div>
					)}

					{/* 7. SETTINGS TAB */}
					{activeTab === "settings" && (
						<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<div>
								<h2 className="text-xl font-bold tracking-tight">Business Configuration Editor</h2>
								<p className="text-xs text-zinc-500">Edit company metadata, lead stages definitions, and financial defaults configuration</p>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Company Configuration Card */}
								<Card className="bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-800/80 shadow-sm p-5 space-y-4">
									<div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
										<Building2 className="h-4.5 w-4.5 text-zinc-550" />
										<h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-150 uppercase tracking-wide">Company Info</h3>
									</div>
									<div className="space-y-3 text-xs">
										<div className="grid grid-cols-2 gap-2">
											<div className="space-y-1">
												<label className="text-[9px] uppercase font-bold text-zinc-400">Legal Company Name</label>
												<Input value={settings.company.name} onChange={(e) => setSettings(prev => ({ ...prev, company: { ...prev.company, name: e.target.value } }))} className="h-9 text-xs border-zinc-200 bg-white" />
											</div>
											<div className="space-y-1">
												<label className="text-[9px] uppercase font-bold text-zinc-400">Brand Display Name</label>
												<Input value={settings.company.displayName} onChange={(e) => setSettings(prev => ({ ...prev, company: { ...prev.company, displayName: e.target.value } }))} className="h-9 text-xs border-zinc-200 bg-white" />
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-[9px] uppercase font-bold text-zinc-400">Company Tagline</label>
											<Input value={settings.company.tagline} onChange={(e) => setSettings(prev => ({ ...prev, company: { ...prev.company, tagline: e.target.value } }))} className="h-9 text-xs border-zinc-200 bg-white" />
										</div>
										<div className="grid grid-cols-2 gap-2">
											<div className="space-y-1">
												<label className="text-[9px] uppercase font-bold text-zinc-400">GSTIN Number</label>
												<Input value={settings.company.gstNumber} onChange={(e) => setSettings(prev => ({ ...prev, company: { ...prev.company, gstNumber: e.target.value } }))} className="h-9 text-xs border-zinc-200 bg-white" />
											</div>
											<div className="space-y-1">
												<label className="text-[9px] uppercase font-bold text-zinc-400">PAN Card Number</label>
												<Input value={settings.company.panNumber} onChange={(e) => setSettings(prev => ({ ...prev, company: { ...prev.company, panNumber: e.target.value } }))} className="h-9 text-xs border-zinc-200 bg-white" />
											</div>
										</div>
										<div className="grid grid-cols-2 gap-2">
											<div className="space-y-1">
												<label className="text-[9px] uppercase font-bold text-zinc-400">Support Phone</label>
												<Input value={settings.company.phone} onChange={(e) => setSettings(prev => ({ ...prev, company: { ...prev.company, phone: e.target.value } }))} className="h-9 text-xs border-zinc-200 bg-white" />
											</div>
											<div className="space-y-1">
												<label className="text-[9px] uppercase font-bold text-zinc-400">Support Email</label>
												<Input value={settings.company.email} onChange={(e) => setSettings(prev => ({ ...prev, company: { ...prev.company, email: e.target.value } }))} className="h-9 text-xs border-zinc-200 bg-white" />
											</div>
										</div>
									</div>
								</Card>

								{/* CRM & Financial Configs */}
								<div className="space-y-6">
									<Card className="bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-800/80 shadow-sm p-5 space-y-4">
										<div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
											<Coins className="h-4.5 w-4.5 text-zinc-550" />
											<h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-150 uppercase tracking-wide">Financial Settings</h3>
										</div>
										<div className="space-y-3 text-xs">
											<div className="space-y-1">
												<label className="text-[9px] uppercase font-bold text-zinc-400">Default Commission % (by milestone)</label>
												<Input value={settings.financial.commissionDefaults} onChange={(e) => setSettings(prev => ({ ...prev, financial: { ...prev.financial, commissionDefaults: e.target.value } }))} className="h-9 text-xs border-zinc-200 bg-white" />
											</div>
											<div className="grid grid-cols-2 gap-2">
												<div className="space-y-1">
													<label className="text-[9px] uppercase font-bold text-zinc-400">Penalty Rate / Day (₹)</label>
													<Input type="number" value={settings.financial.penaltyRatePerDay} onChange={(e) => setSettings(prev => ({ ...prev, financial: { ...prev.financial, penaltyRatePerDay: Number(e.target.value) } }))} className="h-9 text-xs border-zinc-200 bg-white" />
												</div>
												<div className="space-y-1">
													<label className="text-[9px] uppercase font-bold text-zinc-400">EMI Grace Days</label>
													<Input type="number" value={settings.financial.penaltyGraceDays} onChange={(e) => setSettings(prev => ({ ...prev, financial: { ...prev.financial, penaltyGraceDays: Number(e.target.value) } }))} className="h-9 text-xs border-zinc-200 bg-white" />
												</div>
											</div>
										</div>
									</Card>

									<Card className="bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-800/80 shadow-sm p-5 space-y-4">
										<div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
											<Bell className="h-4.5 w-4.5 text-zinc-550" />
											<h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-150 uppercase tracking-wide">Notifications & Lead Settings</h3>
										</div>
										<div className="space-y-3 text-xs">
											<div className="grid grid-cols-2 gap-2">
												<div className="space-y-1">
													<label className="text-[9px] uppercase font-bold text-zinc-400">EMI Reminder Days Before</label>
													<Input type="number" value={settings.notifications.emiReminderDays} onChange={(e) => setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, emiReminderDays: Number(e.target.value) } }))} className="h-9 text-xs border-zinc-200 bg-white" />
												</div>
												<div className="flex flex-col gap-1 justify-center pt-3">
													<label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
														<input type="checkbox" checked={settings.notifications.overdueAlerts} onChange={(e) => setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, overdueAlerts: e.target.checked } }))} className="rounded text-indigo-650 w-4 h-4 border-zinc-200" />
														<span>Enable Overdue Alerts</span>
													</label>
												</div>
											</div>
											<div className="space-y-1">
												<label className="text-[9px] uppercase font-bold text-zinc-400">CRM Lead Pipeline Stages</label>
												<Input value={settings.crm.leadStages} onChange={(e) => setSettings(prev => ({ ...prev, crm: { ...prev.crm, leadStages: e.target.value } }))} className="h-9 text-xs border-zinc-200 bg-white" />
											</div>
										</div>
									</Card>
								</div>
							</div>

							<div className="flex justify-end border-t border-zinc-100 pt-4">
								<Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow px-5" onClick={() => {
									toast.success("Business config saved in local settings state!");
									console.log("Updated config settings payload:", settings);
								}}>
									Save All Config
								</Button>
							</div>
						</div>
					)}

					{/* 8. ROLE PERMISSIONS TAB */}
					{activeTab === "permissions" && (
						<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<div>
								<h2 className="text-xl font-bold tracking-tight">Role Permissions Matrix Table</h2>
								<p className="text-xs text-zinc-500">Configure role-based action access scopes for all application modules</p>
							</div>

							<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
								<div className="overflow-x-auto">
									<table className="w-full text-xs border-collapse">
										<thead>
											<tr className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-150 dark:border-zinc-800">
												<th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-zinc-500">Module / Role</th>
												{INITIAL_ROLES.map((role) => (
													<th key={role} className="px-4 py-3 text-center font-bold uppercase tracking-wider text-zinc-500 capitalize">{role}</th>
												))}
											</tr>
										</thead>
										<tbody>
											{INITIAL_MODULE_KEYS.map((moduleKey) => (
												<tr key={moduleKey} className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50/50">
													<td className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 capitalize">{moduleKey}</td>
													{INITIAL_ROLES.map((role) => {
														const perm = permissions.find(p => p.roleName === role && p.moduleKey === moduleKey);
														const viewChecked = perm?.view || false;
														const createChecked = perm?.create || false;
														const editChecked = perm?.edit || false;
														const deleteChecked = perm?.delete || false;
														const exportChecked = perm?.export || false;

														return (
															<td key={role} className="px-4 py-3">
																<div className="flex flex-col gap-1.5 justify-center items-center">
																	<label className="flex items-center gap-1 cursor-pointer">
																		<input
																			type="checkbox"
																			checked={viewChecked}
																			onChange={() => handlePermissionToggle(role, moduleKey, "view")}
																			className="rounded text-indigo-655 w-3.5 h-3.5 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700"
																		/>
																		<span className="text-[9px] uppercase tracking-wider font-mono text-zinc-400">View</span>
																	</label>
																	<label className="flex items-center gap-1 cursor-pointer">
																		<input
																			type="checkbox"
																			checked={createChecked}
																			onChange={() => handlePermissionToggle(role, moduleKey, "create")}
																			className="rounded text-emerald-655 w-3.5 h-3.5 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700"
																		/>
																		<span className="text-[9px] uppercase tracking-wider font-mono text-zinc-400">Create</span>
																	</label>
																	<label className="flex items-center gap-1 cursor-pointer">
																		<input
																			type="checkbox"
																			checked={editChecked}
																			onChange={() => handlePermissionToggle(role, moduleKey, "edit")}
																			className="rounded text-amber-655 w-3.5 h-3.5 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700"
																		/>
																		<span className="text-[9px] uppercase tracking-wider font-mono text-zinc-400">Edit</span>
																	</label>
																	<label className="flex items-center gap-1 cursor-pointer">
																		<input
																			type="checkbox"
																			checked={deleteChecked}
																			onChange={() => handlePermissionToggle(role, moduleKey, "delete")}
																			className="rounded text-red-655 w-3.5 h-3.5 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700"
																		/>
																		<span className="text-[9px] uppercase tracking-wider font-mono text-zinc-400">Delete</span>
																	</label>
																</div>
															</td>
														);
													})}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</Card>

							<div className="flex justify-end">
								<Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow px-5" onClick={() => {
									toast.success("Permissions matrix successfully saved!");
								}}>
									Apply Changes
								</Button>
							</div>
						</div>
					)}

				</div>
			</div>

			{/* ==============================================
			    MODALS & DRAWERS FOR ACTIONS
			============================================== */}

			{/* HOLD COMMISSION MODAL */}
			{holdModalOpen && selectedComm && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setHoldModalOpen(false)} />
					<div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-sm w-full z-10 overflow-hidden text-zinc-900 dark:text-zinc-50">
						<div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 font-bold text-zinc-800 dark:text-zinc-150 text-sm">
							Hold Advisor Commission
						</div>
						<form onSubmit={submitHold} className="p-5 space-y-4">
							<div className="space-y-1">
								<p className="text-xs font-semibold">Advisor: {selectedComm.advisorName}</p>
								<p className="text-[10px] text-zinc-400">Holding Amount: {formatCurrency(selectedComm.totalAmount - selectedComm.paidAmount)}</p>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Hold Reason</label>
								<select
									value={holdReason}
									onChange={(e) => setHoldReason(e.target.value)}
									className="text-xs h-9 border border-zinc-200 dark:border-zinc-800 rounded px-2 w-full dark:bg-zinc-900"
								>
									<option value="dispute">Transaction Dispute</option>
									<option value="pending_kyc">Pending KYC Documents</option>
									<option value="manual_hold">Administrative Hold</option>
									<option value="policy_violation">Policy Violation</option>
								</select>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Internal Notes / Reason Details</label>
								<Input
									value={holdNotes}
									onChange={(e) => setHoldNotes(e.target.value)}
									required
									placeholder="e.g. Waiting for PAN upload verify"
									className="h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
								<Button size="sm" type="button" variant="outline" onClick={() => setHoldModalOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" type="submit" className="bg-red-600 hover:bg-red-700 text-white font-semibold">
									Confirm Hold
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* APPROVE/REJECT EXPENSE MODAL */}
			{expenseActionOpen && selectedExp && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setExpenseActionOpen(false)} />
					<div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-sm w-full z-10 overflow-hidden text-zinc-900 dark:text-zinc-50">
						<div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-800 font-bold text-zinc-800 dark:text-zinc-150 text-sm">
							Verify & Approve Office Expense
						</div>
						<div className="p-5 space-y-4">
							<div className="space-y-1 text-xs">
								<p className="font-semibold">{selectedExp.description}</p>
								<p className="font-mono font-bold text-indigo-650 dark:text-indigo-400">Amount: {formatCurrency(selectedExp.amount)}</p>
								<p className="text-[10px] text-zinc-400">Vendor: {selectedExp.vendor}</p>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Audit Notes / Comments</label>
								<Input
									value={actionNotes}
									onChange={(e) => setActionNotes(e.target.value)}
									placeholder="Justification note or rejection reason"
									className="h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
								<Button size="sm" type="button" variant="outline" onClick={() => setExpenseActionOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-medium" onClick={() => submitExpenseAction("approved")}>
									Approve Claim
								</Button>
								<Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => submitExpenseAction("rejected")}>
									Reject Claim
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* REJECT LEAVE REQUEST MODAL */}
			{leaveActionOpen && selectedLeave && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLeaveActionOpen(false)} />
					<div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-sm w-full z-10 overflow-hidden text-zinc-900 dark:text-zinc-50">
						<div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-800 font-bold text-zinc-800 dark:text-zinc-150 text-sm">
							Reject Employee Leave Application
						</div>
						<form onSubmit={submitLeaveReject} className="p-5 space-y-4">
							<div className="text-xs">
								<p className="font-semibold">Employee: {selectedLeave.employeeName}</p>
								<p className="text-zinc-500">Duration: {selectedLeave.leaveFrom} to {selectedLeave.leaveTo} ({selectedLeave.days} days)</p>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Rejection Justification</label>
								<Input
									value={leaveRejectReason}
									onChange={(e) => setLeaveRejectReason(e.target.value)}
									required
									placeholder="e.g. High pending workload at sales end"
									className="h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
								<Button size="sm" type="button" variant="outline" onClick={() => setLeaveActionOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" type="submit" className="bg-red-600 hover:bg-red-700 text-white font-semibold">
									Confirm Reject
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* CREATE ANNOUNCEMENT MODAL */}
			{announcementModalOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAnnouncementModalOpen(false)} />
					<div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-sm w-full z-10 overflow-hidden text-zinc-900 dark:text-zinc-50">
						<div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-800 font-bold text-zinc-800 dark:text-zinc-150 text-sm">
							Publish Internal Announcement
						</div>
						<form onSubmit={submitAnnouncement} className="p-5 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Announcement Title</label>
								<Input
									value={annTitle}
									onChange={(e) => setAnnTitle(e.target.value)}
									required
									placeholder="e.g. Policy updates Q2"
									className="h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
								/>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Announcement Body Content</label>
								<textarea
									value={annBody}
									onChange={(e) => setAnnBody(e.target.value)}
									required
									rows={3}
									placeholder="Write description here..."
									className="text-xs border border-zinc-200 dark:border-zinc-800 rounded p-2 w-full dark:bg-zinc-900"
								/>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Category Type</label>
								<select
									value={annType}
									onChange={(e) => setAnnType(e.target.value)}
									className="text-xs h-9 border border-zinc-200 dark:border-zinc-800 rounded px-2 w-full dark:bg-zinc-900"
								>
									<option value="general">General Broadcast</option>
									<option value="policy">Policy Update</option>
									<option value="alert">Alert / Advisory</option>
								</select>
							</div>
							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
								<Button size="sm" type="button" variant="outline" onClick={() => setAnnouncementModalOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" type="submit" className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold">
									Publish Broadcast
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* DEBT RECOVERY: LEGAL ESCALATION DRAWER */}
			{escalationDrawerOpen && selectedRecoveryCustomer && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-end">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEscalationDrawerOpen(false)} />
					<div className="relative max-w-sm w-full bg-white dark:bg-zinc-900 shadow-2xl flex flex-col h-full border-l border-zinc-200 dark:border-zinc-850 z-10 text-zinc-900 dark:text-zinc-50">
						<div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800">
							<div>
								<h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-150">Escalate Customer to Legal</h2>
								<p className="text-[10px] text-zinc-400 font-mono">Reference: {noticeRef}</p>
							</div>
							<button className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500" onClick={() => setEscalationDrawerOpen(false)}>
								<X className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={submitLegalEscalation} className="flex-1 overflow-y-auto p-5 space-y-4">
							<div className="bg-red-50/20 dark:bg-red-950/20 rounded p-3 border border-red-100 dark:border-red-900/40 text-xs space-y-1">
								<p className="font-semibold text-red-700 dark:text-red-400">Defaulter Account Summary</p>
								<p className="font-medium">Customer: {selectedRecoveryCustomer.customerName}</p>
								<p className="font-mono font-bold text-red-600 dark:text-red-400">Overdue: {formatCurrency(selectedRecoveryCustomer.overdueAmount)}</p>
								<p className="text-[10px] text-zinc-400">Project: {selectedRecoveryCustomer.project} ({selectedRecoveryCustomer.plotNo})</p>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Assign Legal Counsel (Lawyer)</label>
								<Input
									value={lawyerName}
									onChange={(e) => setLawyerName(e.target.value)}
									required
									placeholder="e.g. Adv. Alok Verma"
									className="h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
								/>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Lawyer Contact / Phone</label>
								<Input
									value={lawyerContact}
									onChange={(e) => setLawyerContact(e.target.value)}
									required
									placeholder="e.g. 9812345678"
									className="h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
								/>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Notice Reference Number</label>
								<Input
									value={noticeRef}
									disabled
									className="h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 opacity-60"
								/>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Escalation Case Notes / Details</label>
								<textarea
									value={escalationNotes}
									onChange={(e) => setEscalationNotes(e.target.value)}
									required
									rows={4}
									placeholder="Detail notice parameters, overdue counts, registry issues..."
									className="text-xs border border-zinc-200 dark:border-zinc-800 rounded p-2 w-full dark:bg-zinc-900"
								/>
							</div>

							<div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
								<Button size="sm" type="button" variant="outline" onClick={() => setEscalationDrawerOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" type="submit" className="bg-red-700 hover:bg-red-800 text-white font-semibold">
									Issue Legal Notice
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
