import type { MetadataRoute } from "next";
import { BANK_NAME } from "@/lib/config";

// The ONE web app manifest. Next.js serves it at /manifest.webmanifest and adds
// <link rel="manifest"> to every page by itself. There is no public/manifest.json.
//
// "scope" tells the phone which addresses belong to the app. Everything under
// "/" is inside it, so Transfer, Transactions, QR Pay ... stay in the app window.
export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: BANK_NAME,
        short_name: BANK_NAME,
        description: `${BANK_NAME} online banking`,
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#d9d0f2",
        theme_color: "#d9d0f2",
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}