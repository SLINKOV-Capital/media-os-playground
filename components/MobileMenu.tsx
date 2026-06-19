"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const menuItems = [
  { href: "/materials", label: "Материалы" },
  { href: "/nihuyasi", label: "Нихуяси" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="mobile-menu">
      <button
        type="button"
        className="mobile-menu-trigger"
        aria-label="Меню"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="mobile-menu-backdrop"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          />
          <nav className="mobile-menu-panel" aria-label="Дополнительная навигация">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-menu-link${
                  isActive(pathname, item.href) ? " is-active" : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
            <form action="/auth/logout" method="post" className="mobile-menu-logout">
              <button type="submit">Выйти</button>
            </form>
          </nav>
        </>
      )}
    </div>
  );
}
