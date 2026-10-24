"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  className?: string;
  children: ReactNode;
};

// Asks the server to delete the login cookie, then opens the login page.
export default function LogoutButton({ className, children }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {children}
    </button>
  );
}
