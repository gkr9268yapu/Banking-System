import Link from "next/link";
import { History, QrCode, ScanLine, Send, type LucideIcon } from "lucide-react";

type Action = {
    label: string;
    href: string;
    icon: LucideIcon;
    circle: string; // pastel color of the round icon
    // Only for devices with a touch screen (phones and tablets).
    touchOnly?: boolean;
};

const actions: Action[] = [
    { label: "Send", href: "/transfer", icon: Send, circle: "bg-pastel-blue" },
    { label: "Scan", href: "/qr?tab=scan", icon: ScanLine, circle: "bg-pastel-purple", touchOnly: true },
    { label: "My QR", href: "/qr", icon: QrCode, circle: "bg-pastel-orange" },
    { label: "History", href: "/transactions", icon: History, circle: "bg-pastel-blue" },
];

// Four big buttons for phones. Hidden from the "md" breakpoint (768px) up,
// where the sidebar already has these links. "pointer-coarse:" is the Tailwind
// version of the (pointer: coarse) media query, so Scan only appears on touch screens.
export default function QuickActions() {
    return (
        <nav aria-label="Quick actions" className="flex gap-3 md:hidden">
            {actions.map(({ label, href, icon: Icon, circle, touchOnly }) => (
                <Link
                    key={label}
                    href={href}
                    className={`${touchOnly ? "hidden pointer-coarse:flex" : "flex"
                        } flex-1 flex-col items-center gap-2 rounded-xl bg-surface px-2 py-4 text-xs font-medium text-ink`}
                >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${circle}`}>
                        <Icon size={20} />
                    </span>
                    {label}
                </Link>
            ))}
        </nav>
    );
}