"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QuickNihuyasiModal } from "@/components/QuickNihuyasiModal";
import { useCallback, useState } from "react";

const navItems = [
  { href: "/today", label: "Сегодня" },
  {
    href: "/documents",
    label: "Документы",
    addHref: "/documents/new",
    addLabel: "Добавить документ",
  },
  { href: "/templates", label: "Шаблоны" },
  {
    href: "/materials",
    label: "Материалы",
    addHref: "/materials/new",
    addLabel: "Добавить материал",
  },
  { href: "/nihuyasi", label: "Нихуяси", quickAdd: true, addLabel: "Добавить Нихуяси" },
];

function isActive(pathname: string, href: string) {
  if (href === "/documents") {
    return pathname === "/documents" || pathname.startsWith("/documents/");
  }

  if (href === "/templates") {
    return pathname === "/templates" || pathname.startsWith("/templates/");
  }

  if (href === "/materials") {
    return pathname === "/materials" || pathname.startsWith("/materials/");
  }

  if (href === "/nihuyasi") {
    return pathname === "/nihuyasi" || pathname.startsWith("/nihuyasi/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [quickNihuyasiOpen, setQuickNihuyasiOpen] = useState(false);
  const closeQuickNihuyasi = useCallback(() => setQuickNihuyasiOpen(false), []);

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Link href="/documents" className="sidebar-brand">
          Media OS
        </Link>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div key={item.href} className="sidebar-nav-row">
              <Link
                href={item.href}
                className={`sidebar-link${
                  isActive(pathname, item.href) ? " is-active" : ""
                }`}
              >
                {item.label}
              </Link>
              {item.addHref && (
                <Link
                  href={item.addHref}
                  className="sidebar-add-button"
                  aria-label={item.addLabel}
                  title={item.addLabel}
                >
                  +
                </Link>
              )}
              {item.quickAdd && (
                <button
                  type="button"
                  className="sidebar-add-button"
                  aria-label={item.addLabel}
                  title={item.addLabel}
                  onClick={() => setQuickNihuyasiOpen(true)}
                >
                  +
                </button>
              )}
            </div>
          ))}
        </nav>
      </div>
      <form action="/auth/logout" method="post" className="sidebar-logout">
        <button type="submit">Выйти</button>
      </form>
      <QuickNihuyasiModal open={quickNihuyasiOpen} onClose={closeQuickNihuyasi} />
    </aside>
  );
}
