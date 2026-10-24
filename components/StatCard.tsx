import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  // Color of the round icon background.
  tone: "blue" | "purple" | "orange";
  // Optional small grey line under the value (for example the account number).
  hint?: string;
  // Optional text color for the value (for example red or blue for money in/out).
  valueClassName?: string;
  // Optional small control in the top right corner (for example the eye button).
  action?: ReactNode;
};

const toneClasses = {
  blue: "bg-pastel-blue",
  purple: "bg-pastel-purple",
  orange: "bg-pastel-orange",
};

// Small summary box: round colored icon, grey label, bold value.
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  valueClassName = "text-ink",
  action,
}: StatCardProps) {
  return (
    <div className="relative flex items-center justify-center gap-4 rounded-xl bg-surface px-5 py-6">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses[tone]}`}
      >
        <Icon size={20} className="text-ink" />
      </span>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className={`text-lg font-bold ${valueClassName}`}>{value}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {action && <div className="absolute right-2 top-2">{action}</div>}
    </div>
  );
}