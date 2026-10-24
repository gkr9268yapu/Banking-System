import type { ReactNode } from "react";

type ListRowProps = {
  // Left: round icon (or initials) on a pastel circle.
  icon: ReactNode;
  tone: "blue" | "purple" | "orange";
  title: string;
  subtitle: string;
  // Middle: bold value with a small grey label under it.
  value: string;
  valueLabel: string;
  // Right: colored value with a small label under it.
  rightValue: string;
  rightLabel: string;
  // Tailwind text color class for the right value, for example "text-sent".
  rightClassName?: string;
  // Let a long title use two lines instead of cutting it with "..."
  // (used by the admin list, where both names must stay readable).
  wrapTitle?: boolean;
};

const toneClasses = {
  blue: "bg-pastel-blue",
  purple: "bg-pastel-purple",
  orange: "bg-pastel-orange",
};

// One row of a list. Put several inside a <ListRows> wrapper (see below)
// so every second row gets the light grey zebra background.
export default function ListRow({
  icon,
  tone,
  title,
  subtitle,
  value,
  valueLabel,
  rightValue,
  rightLabel,
  rightClassName = "text-ink",
  wrapTitle = false,
}: ListRowProps) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 even:bg-surface">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-ink ${toneClasses[tone]}`}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold text-ink ${wrapTitle ? "break-words" : "truncate"}`}>
          {title}
        </p>
        <p className="truncate text-[11px] text-muted">{subtitle}</p>
      </div>

      <div className="shrink-0 text-left sm:w-28">
        <p className="text-sm font-bold text-ink">{value}</p>
        <p className="text-[11px] text-muted">{valueLabel}</p>
      </div>

      <div className="w-20 shrink-0 text-right">
        <p className={`text-sm font-bold ${rightClassName}`}>{rightValue}</p>
        <p className="text-[11px] text-muted">{rightLabel}</p>
      </div>
    </div>
  );
}

// Wrapper that holds the rows. The "even:" style in ListRow needs
// the rows to be direct children of one parent, so use this wrapper.
export function ListRows({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden">{children}</div>;
}