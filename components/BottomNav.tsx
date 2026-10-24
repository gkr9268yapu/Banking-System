"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav, customerNav } from "@/lib/nav";

type BottomNavProps = {
  role: "customer" | "admin";
  activeHref?: string;
};

// Phone navigation bar fixed to the bottom of the screen.
// It replaces the sidebar below the "md" breakpoint (768px).
export default function BottomNav({ role, activeHref }: BottomNavProps) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;
  const items = role === "admin" ? adminNav : customerNav;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-frame bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = current === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                  active ? "font-bold text-ink" : "text-muted"
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
