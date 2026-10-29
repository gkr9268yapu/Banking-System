"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UserCog } from "lucide-react";
import { BANK_NAME } from "@/lib/config";
import LogoutButton from "@/components/LogoutButton";
import { adminNav, customerNav, type NavItem } from "@/lib/nav";

type SidebarProps = {
  // Decides which list of links to show.
  role: "customer" | "admin";
  // Optional. If missing we use the current page address to find the active link.
  activeHref?: string;
};

// One row in the sidebar: icon + label.
// The active row is bold and gets a thin dark bar on the far left edge.
function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: NavItem["icon"];
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 px-8 py-2.5 text-[15px] ${active ? "font-bold text-ink" : "text-muted hover:text-ink"
        }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 bg-ink" />
      )}
      <Icon size={20} className={active ? "text-ink" : "text-muted"} />
      {label}
    </Link>
  );
}

// Desktop sidebar. It is hidden on phones, where BottomNav is used instead.
export default function Sidebar({ role, activeHref }: SidebarProps) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;
  const items = role === "admin" ? adminNav : customerNav;

  return (
    // The page itself no longer scrolls (see PageShell), so the sidebar simply
    // fills the height. Settings and Log out stay at the bottom.
    <aside className="hidden w-[230px] shrink-0 flex-col overflow-y-auto md:flex">
      <div className="px-8 pb-8 pt-8 text-[22px] text-ink">{BANK_NAME}</div>

      <nav className="flex flex-col gap-1.5">
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            active={current === item.href}
          />
        ))}
      </nav>

      {/* mt-auto pushes Settings and Log out to the bottom */}
      <div className="mt-auto flex flex-col gap-1.5 pb-8">
        <SidebarLink
          href="/settings"
          label="Settings"
          icon={UserCog}
          active={current === "/settings"}
        />
        {/* Same look as a link, but it is a button that ends the session */}
        <LogoutButton className="flex w-full items-center gap-3 px-8 py-2.5 text-left text-[15px] text-muted hover:text-ink">
          <LogOut size={20} className="text-muted" />
          Log out
        </LogoutButton>
      </div>
    </aside>
  );
}