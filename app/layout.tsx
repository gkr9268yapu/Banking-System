import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { BANK_NAME } from "@/lib/config";
import "./globals.css";

// Roboto is the font used in the reference design.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: BANK_NAME,
  description: `${BANK_NAME} online banking`,
  // iPhone "Add to Home Screen": open as an app window, not as a Safari page.
  appleWebApp: {
    capable: true,
    title: BANK_NAME,
    statusBarStyle: "default",
  },
  // Older iPhones only read this exact tag; newer ones read the manifest.
  other: { "apple-mobile-web-app-capable": "yes" },
  // iOS uses this icon for the home-screen button.
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// viewportFit "cover" lets the page use the full phone screen,
// the components then add safe-area padding for notches.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d9d0f2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roboto.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}