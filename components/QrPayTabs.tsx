"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import QrCard from "@/components/QrCard";
import QrScanPay from "@/components/QrScanPay";

type QrPayTabsProps = {
  initialTab: "my" | "scan"; // from /qr?tab=scan
  balance: string;
};

// Is the main pointer a finger (phone or tablet)? A laptop mouse is "fine".
function subscribe(callback: () => void) {
  const query = window.matchMedia("(pointer: coarse)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const isTouch = () => window.matchMedia("(pointer: coarse)").matches;
const serverGuess = () => false; // the server cannot know, so it assumes no touch

export default function QrPayTabs({ initialTab, balance }: QrPayTabsProps) {
  const [tab, setTab] = useState(initialTab);
  const touch = useSyncExternalStore(subscribe, isTouch, serverGuess);

  const tabs = [
    { key: "my" as const, label: "My QR" },
    { key: "scan" as const, label: "Scan" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2" role="tablist" aria-label="QR Pay">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-xl px-6 py-2 text-sm font-medium ${
              tab === item.key ? "bg-ink text-white" : "bg-surface text-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "my" && <QrCard />}

      {/* The camera scanner is only built on touch devices. */}
      {tab === "scan" &&
        (touch ? (
          <QrScanPay balance={balance} />
        ) : (
          <div className="max-w-xl rounded-xl bg-surface px-6 py-8 text-sm text-ink">
            <p>Scanning needs a phone camera. Open GKR Bank on your phone to scan a QR code.</p>
            <Link
              href="/transfer"
              className="mt-4 inline-block rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white"
            >
              Pay by account number
            </Link>
          </div>
        ))}
    </div>
  );
}