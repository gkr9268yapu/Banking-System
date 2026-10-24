import type { ReactNode } from "react";

type Column = {
  key: string;
  label: string;
  align?: "left" | "right";
};

type DarkTableProps = {
  columns: Column[];
  // Each row is an object whose keys match the column keys.
  rows: Record<string, ReactNode>[];
  // Shown inside the card when there are no rows.
  emptyMessage?: string;
};

// Near-black card with a light table inside.
// On small screens the table scrolls sideways inside the card,
// so the page itself never scrolls sideways.
export default function DarkTable({ columns, rows, emptyMessage }: DarkTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl bg-night px-4 py-5 text-white">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-white/30 text-xs">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap pb-3 pr-3 font-normal last:pr-0 ${col.align === "right" ? "text-right" : "text-left"
                  }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyMessage && (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-white/60">
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap py-2 pr-3 last:pr-0 ${col.align === "right" ? "text-right" : "text-left"
                    }`}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Percentage with a small arrow: up for positive, down for negative,
// plain bold white for zero.
export function TrendValue({ value }: { value: number }) {
  if (value === 0) {
    return <span className="font-bold text-white">0%</span>;
  }
  const up = value > 0;
  return (
    <span className="text-white/60">
      <span className="mr-1 text-[8px]">{up ? "▲" : "▼"}</span>
      {up ? "+" : ""}
      {value}%
    </span>
  );
}