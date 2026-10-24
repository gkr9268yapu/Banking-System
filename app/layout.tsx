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
