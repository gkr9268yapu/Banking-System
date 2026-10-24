"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyAccountNumber({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // The browser may block clipboard access; nothing else to do.
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-xl bg-surface px-4 py-2 text-sm text-ink hover:opacity-80"
        >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy account number"}
        </button>
    );
}