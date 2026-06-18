"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/today", label: "Сегодня" },
  { href: "/documents", label: "Документы" },
  { href: "/templates", label: "Шаблоны" },
  { href: "/materials", label: "Материалы" },
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

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Link href="/documents" className="sidebar-brand">
          Media OS
        </Link>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${
                isActive(pathname, item.href) ? " is-active" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <form action="/auth/logout" method="post" className="sidebar-logout">
        <button type="submit">Выйти</button>
      </form>
    </aside>
  );
}
