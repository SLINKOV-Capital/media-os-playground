"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/manager", label: "Диспетчер", icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h5v14H4zM10 5h5v9h-5zM16 5h4v5h-4zM16 11h4v8h-4z" stroke="currentColor" strokeWidth="1.6"/></svg>) },
  {
    href: "/today",
    label: "Сегодня",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/documents",
    label: "Документы",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 4h8l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M14 4v4h4M8 13h8M8 17h5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/templates",
    label: "Шаблоны",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="8"
          height="8"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <rect
          x="13"
          y="3"
          width="8"
          height="8"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <rect
          x="3"
          y="13"
          width="8"
          height="8"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <rect
          x="13"
          y="13"
          width="8"
          height="8"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.75"
        />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/manager") return pathname === "/manager" || pathname.startsWith("/manager/");
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

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav" aria-label="Основная навигация">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-bottom-nav-item${active ? " is-active" : ""}`}
          >
            <span className="mobile-bottom-nav-icon">{item.icon}</span>
            <span className="mobile-bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
