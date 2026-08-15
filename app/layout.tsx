import type { Metadata, Viewport } from "next";
import { Unbounded } from "next/font/google";
import "./fonts-pt-root-ui.css";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "500", "600", "700"],
  variable: "--font-display-family",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://soloten.com"),
  title: {
    default: "SLINKOV MEDIA",
    template: "%s — SLINKOV MEDIA",
  },
  description:
    "Дмитрий Слиньков — писатель, консультант по ИИ, автор проектов на стыке технологий и человеческих историй.",
  applicationName: "SLINKOV MEDIA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "SLINKOV MEDIA",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F9461D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={unbounded.variable}>
      <body>{children}</body>
    </html>
  );
}
