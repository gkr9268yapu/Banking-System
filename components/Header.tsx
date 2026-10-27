"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { getInitials } from "@/lib/format";
import { userMenu } from "@/lib/nav";

type HeaderProps = {
  title: string;
  userName: string;
  role: "customer" | "admin";
};

// Top bar inside the main area: page title on the left,
// bell + avatar + name + dropdown on the right.
export default function Header({ title, userName, role }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // The admin has no "My Account" page (it is for customers only), so the
  // admin menu shows Settings, which holds the admin's profile.
  const menuItems = role === "admin" ? userMenu.filter((item) => item.label === "Settings") : userMenu;

  return (
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-[22px] font-bold text-ink">{title}</h1>

      <div className="relative flex items-center gap-4">
        <button type="button" aria-label="Notifications" className="text-ink">
          <Bell size={18} fill="currentColor" />
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          className="flex items-center gap-2.5"
        >
          {/* Avatar: initials on a soft colored circle */}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pastel-purple text-xs font-bold text-ink">
            {getInitials(userName)}
          </span>
          <span className="hidden text-sm font-medium text-ink sm:inline">
            {userName}
          </span>
          <ChevronDown size={16} className="text-ink" />
        </button>

        {menuOpen && (
          <>
            {/* Invisible full-screen layer: clicking anywhere outside closes the menu */}
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <ul className="absolute right-0 top-full z-20 mt-3 w-44 rounded-xl bg-white py-2 shadow-lg ring-1 ring-black/5">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-ink hover:bg-surface"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <LogoutButton className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface">
                  Log out
                </LogoutButton>
              </li>
            </ul>
          </>
        )}
      </div>
    </header>
  );
}