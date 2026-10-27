"use client";

import { useEffect } from "react";

// Registers /sw.js (the offline page helper) once the app is open.
// It only runs in the production build, so it never gets in the way while developing.
export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") return;
        if (!("serviceWorker" in navigator)) return;
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
            // The app works fine without it, so a failure is ignored.
        });
    }, []);

    return null;
}