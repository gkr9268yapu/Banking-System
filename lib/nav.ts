import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  House,
  QrCode,
  Reply,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

// Main sidebar links for a customer (section 5.1 of the spec).
export const customerNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Transfer", href: "/transfer", icon: Reply },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "My Account", href: "/account", icon: CreditCard },
  { label: "QR Pay", href: "/qr", icon: QrCode },
];

// Main sidebar links for the admin (section 5.4 of the spec).
export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: House },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Transactions", href: "/admin/transactions", icon: ArrowLeftRight },
  { label: "Deposit / Withdraw", href: "/admin/cash", icon: Banknote },
  { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
];

// Links in the profile dropdown at the top right.
// "Log out" is not here: it is a button (LogoutButton), not a link.
export const userMenu = [
  { label: "Profile", href: "/account" },
  { label: "Settings", href: "/settings" },
];
