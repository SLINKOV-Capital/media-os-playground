import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  verification: {
    google: "jAJU5wdQSjNvG7ZyIgMJjWQHKkvJ6e32F04eEIC-oqg",
    yandex: ["609d306ce9e41e22", "ee06609a82795574"],
  },
};

export default function PublicLocaleLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
