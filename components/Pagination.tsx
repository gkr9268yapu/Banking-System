import Link from "next/link";

type PaginationProps = {
    page: number;
    pageCount: number;
    total: number;
    prevHref: string; // link to the previous page
    nextHref: string; // link to the next page
};

// "Previous  Page 2 of 5 (87 in total)  Next". The buttons are greyed out
// on the first and the last page.
export default function Pagination({ page, pageCount, total, prevHref, nextHref }: PaginationProps) {
    const buttonClass = "rounded-xl bg-surface px-4 py-2";
    return (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm text-muted">
            {page > 1 ? (
                <Link href={prevHref} className={`${buttonClass} font-medium text-ink`}>
                    Previous
                </Link>
            ) : (
                <span className={`${buttonClass} opacity-50`}>Previous</span>
            )}
            <span>
                Page {page} of {pageCount} ({total} in total)
            </span>
            {page < pageCount ? (
                <Link href={nextHref} className={`${buttonClass} font-medium text-ink`}>
                    Next
                </Link>
            ) : (
                <span className={`${buttonClass} opacity-50`}>Next</span>
            )}
        </nav>
    );
}