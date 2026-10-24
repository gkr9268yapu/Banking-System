import type { ReactNode } from "react";

type DetailListProps = {
    items: { label: string; value: ReactNode }[];
};

// Label on the left, value on the right, light grey on every second row.
export default function DetailList({ items }: DetailListProps) {
    return (
        <dl className="overflow-hidden rounded-xl">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="flex items-center justify-between gap-6 px-5 py-4 even:bg-surface"
                >
                    <dt className="shrink-0 text-xs text-muted">{item.label}</dt>
                    <dd className="min-w-0 break-words text-right text-sm font-medium text-ink">
                        {item.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}