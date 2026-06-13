import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Media OS",
  description: "Человек и ИИ: разжёванное сложное",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
