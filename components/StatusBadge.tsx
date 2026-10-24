// A small colored dot followed by the status text, for example "● Active".
// The text takes the color of its surroundings, so it also works on the dark card.

const dotColors: Record<string, string> = {
    ACTIVE: "bg-emerald-500",
    BLOCKED: "bg-sent",
    DEACTIVATED: "bg-amber-500",
    DELETED: "bg-muted",
};

const labels: Record<string, string> = {
    ACTIVE: "Active",
    BLOCKED: "Blocked",
    DEACTIVATED: "Deactivated",
    DELETED: "Deleted",
};

export default function StatusBadge({ status }: { status: string }) {
    return (
        <span className="inline-flex items-center gap-2">
            <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${dotColors[status] ?? "bg-muted"}`}
            />
            {labels[status] ?? status}
        </span>
    );
}