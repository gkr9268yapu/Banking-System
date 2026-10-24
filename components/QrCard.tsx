"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type QrData = { image: string; name: string; maskedAccount: string };

// "My QR" tab: shows the customer's own QR image and a download button.
// The image comes from the server (/api/qr/me). It holds only a random token.
export default function QrCard() {
    const [data, setData] = useState<QrData | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        fetch("/api/qr/me")
            .then(async (response) => ({ response, body: await response.json() }))
            .then(({ response, body }) => {
                if (cancelled) return;
                if (response.ok) setData(body);
                else setError(body.error ?? "Could not load your QR code.");
            })
            .catch(() => {
                if (!cancelled) setError("Could not reach the server. Check your connection.");
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (error) {
        return (
            <p role="alert" className="rounded-xl bg-pastel-orange/30 px-4 py-3 text-sm text-sent">
                {error}
            </p>
        );
    }
    if (!data) return <p className="text-sm text-muted">Loading your QR code...</p>;

    return (
        <div className="max-w-sm rounded-xl bg-surface px-6 py-8 text-center">
            {/* A data URL is not a normal file, so a plain img tag is used here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={data.image}
                alt="Your GKR Bank payment QR code"
                width={256}
                height={256}
                className="mx-auto h-64 w-64 rounded-xl bg-white p-2"
            />
            <p className="mt-4 text-base font-medium text-ink">{data.name}</p>
            <p className="text-sm text-muted">Account {data.maskedAccount}</p>
            <p className="mt-3 text-xs text-muted">
                Show this code to the person who wants to pay you.
            </p>
            <a
                href={data.image}
                download="gkr-bank-qr.png"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white"
            >
                <Download size={16} />
                Download QR
            </a>
        </div>
    );
}