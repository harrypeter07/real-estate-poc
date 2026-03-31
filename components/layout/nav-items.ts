import {
  LayoutDashboard,
  Building2,
  UserCheck,
  Users,
  Handshake,
  CreditCard,
  Banknote,
  Receipt,
  Bell,
  BarChart3,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  moduleKey?: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: Building2, moduleKey: "projects" },
  { label: "Advisors", href: "/advisors", icon: UserCheck, moduleKey: "projects" },
  { label: "Advisor Analytics", href: "/advisors/analytics", icon: BarChart3, moduleKey: "reports" },
  { label: "Customers", href: "/customers", icon: Users, moduleKey: "projects" },
  { label: "Enquiries", href: "/enquiries", icon: Handshake, moduleKey: "enquiries" },
  { label: "Sales", href: "/sales", icon: Handshake, moduleKey: "sales" },
  { label: "Payments", href: "/payments", icon: CreditCard, moduleKey: "payments" },
  { label: "Commissions", href: "/commissions", icon: Banknote, moduleKey: "commissions" },
  { label: "Expenses", href: "/expenses", icon: Receipt, moduleKey: "expenses" },
  { label: "Messaging", href: "/messaging", icon: Bell, moduleKey: "messaging" },
  { label: "HR", href: "/hr", icon: ClipboardList, moduleKey: "hr" },
  { label: "Reports", href: "/reports", icon: BarChart3, moduleKey: "reports" },
];

export const ADVISOR_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/advisor", icon: LayoutDashboard },
  { label: "Customers", href: "/advisor/customers", icon: Users },
  { label: "Sales", href: "/advisor/sales", icon: Handshake },
  { label: "Payments", href: "/advisor/payments", icon: CreditCard },
  { label: "My Commissions", href: "/advisor/commissions", icon: Banknote },
  { label: "Messaging", href: "/advisor/messaging", icon: Bell },
];