"use client";

import { useEffect, useRef, useState } from "react";

type QrScannerProps = {
    onScan: (text: string) => void; // called once with the text inside the QR
};

// The camera scanner (html5-qrcode). Only used on touch devices.
// The camera needs HTTPS, which Vercel provides.
export default function QrScanner({ onScan }: QrScannerProps) {
    const [error, setError] = useState("");
    // Keep the newest onScan without restarting the camera when it changes.
    const onScanRef = useRef(onScan);
    useEffect(() => {
        onScanRef.current = onScan;
    });

    useEffect(() => {
        let cancelled = false;
        let started = false;
        let handled = false;
        let scanner: import("html5-qrcode").Html5Qrcode | null = null;

        async function start() {
            // Loaded only in the browser, because the library needs the camera API.
            const { Html5Qrcode } = await import("html5-qrcode");
            if (cancelled) return;
            scanner = new Html5Qrcode("qr-reader");
            try {
                await scanner.start(
                    { facingMode: "environment" }, // the back camera
                    { fps: 10, qrbox: { width: 240, height: 240 } },
                    (text) => {
                        if (handled) return; // react to the first code only
                        handled = true;
                        onScanRef.current(text);
                    },
                    () => { }, // called for every frame without a code, nothing to do
                );
                started = true;
                if (cancelled) await stopScanner();
            } catch {
                if (!cancelled) {
                    setError("Could not open the camera. Allow camera access in your browser and try again.");
                }
            }
        }

        async function stopScanner() {
            if (!scanner || !started) return;
            started = false;
            try {
                await scanner.stop();
                scanner.clear();
            } catch {
                // The camera was already closed.
            }
        }

        start();
        // When the tab is left, switch the camera off.
        return () => {
            cancelled = true;
            stopScanner();
        };
    }, []);

    return (
        <div>
            <div id="qr-reader" className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-surface" />
            {error ? (
                <p role="alert" className="mt-3 rounded-xl bg-pastel-orange/30 px-4 py-3 text-sm text-sent">
                    {error}
                </p>
            ) : (
                <p className="mt-3 text-center text-sm text-muted">Point the camera at a GKR Bank QR code.</p>
            )}
        </div>
    );
}