import type { ReactNode } from "react";

// Heading placed above a block, for example "Recent transactions".
export default function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-medium text-ink">{children}</h2>;
}
