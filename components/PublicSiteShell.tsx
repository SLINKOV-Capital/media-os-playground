"use client";

import { FlipText, WaveText } from "@/components/MotionText";
import { SiteClock } from "@/components/SiteClock";
import { PUBLIC_DESKTOP_NAV, PUBLIC_NAV } from "@/lib/publicContent";
import { FOOTER_NAV, PUBLIC_SOCIALS } from "@/lib/publicHome";
import { PUBLIC_SITE_EMAIL } from "@/lib/site";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type PublicSiteShellProps = {
  children: ReactNode;
  /** Full-bleed homepage: hero under transparent header */
  fullBleed?: boolean;
};

export function PublicSiteShell({
  children,
  fullBleed = false,
}: PublicSiteShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!fullBleed) return;

    const update = () => {
      const hero = document.querySelector(".public-hero");
      if (!(hero instanceof HTMLElement)) {
        setScrolledPastHero(window.scrollY > 0);
        return;
      }
      setScrolledPastHero(hero.getBoundingClientRect().bottom <= 0);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [fullBleed]);

  return (
    <div
      className={`public-site${fullBleed ? " public-site--hero" : ""}${
        menuOpen ? " is-menu-open" : ""
      }${scrolledPastHero ? " is-scrolled" : ""}`}
    >
      <header className="public-header">
        <Link
          href="/"
          className="public-logo"
          onClick={() => setMenuOpen(false)}
        >
          SLINKOV MEDIA
        </Link>

        <nav className="public-header-nav" aria-label="Основное меню">
          {PUBLIC_DESKTOP_NAV.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className="public-header-nav-link"
              onClick={() => setMenuOpen(false)}
            >
              <WaveText text={item.label} />
              {index < PUBLIC_DESKTOP_NAV.length - 1 ? "," : ""}
            </Link>
          ))}
        </nav>

        <SiteClock />

        <a
          className="public-header-contact"
          href={`mailto:${PUBLIC_SITE_EMAIL}`}
        >
          <WaveText text="Связаться со мной" />
        </a>

        <button
          type="button"
          className={`public-menu-toggle${menuOpen ? " is-open" : ""}`}
          aria-expanded={menuOpen}
          aria-controls="public-menu"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="public-menu-toggle-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </header>

      {menuOpen && (
        <div
          id="public-menu"
          className="public-menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Меню"
        >
          <nav className="public-menu-nav">
            {PUBLIC_NAV.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className="public-menu-link"
                onClick={() => setMenuOpen(false)}
              >
                <WaveText text={item.label} />
                {index < PUBLIC_NAV.length - 1 ? "," : ""}
              </Link>
            ))}
          </nav>
          <div className="public-menu-meta">
            <p className="public-menu-label">(Связь)</p>
            <a href={`mailto:${PUBLIC_SITE_EMAIL}`}>
              <WaveText text={PUBLIC_SITE_EMAIL} />
            </a>
          </div>
        </div>
      )}

      <main className={fullBleed ? "public-main-bleed" : "public-main"}>
        {children}
      </main>

      <footer className="public-footer" id="razdely">
        <div className="public-footer-grid">
          <div className="public-footer-group public-footer-group--nav">
            <p className="public-home-label public-footer-col-label">(Разделы)</p>
            <ul className="public-footer-list">
              {FOOTER_NAV.map((item, index) => (
                <li key={item.label}>
                  <Link href={item.href}>
                    <FlipText text={item.label} />
                    {index < FOOTER_NAV.length - 1 ? "," : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="public-footer-group public-footer-group--socials">
            <p className="public-home-label public-footer-col-label">(Соцсети)</p>
            <ul className="public-footer-list">
              {PUBLIC_SOCIALS.map((item, index) => (
                <li key={item.label}>
                  <a href={item.href} target="_blank" rel="noreferrer">
                    <FlipText text={item.label} />
                    {index < PUBLIC_SOCIALS.length - 1 ? "," : ""}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="public-footer-col public-footer-col--contact">
            <a
              className="public-footer-email"
              href={`mailto:${PUBLIC_SITE_EMAIL}`}
            >
              <FlipText text={PUBLIC_SITE_EMAIL} />
            </a>
            <p className="public-footer-place">
              Отдыхаю в Подмосковье,
              <br />
              Тружусь глобально
            </p>
          </div>
        </div>

        <p className="public-footer-copy">
          © {new Date().getFullYear()} Дмитрий Слиньков · SLINKOV MEDIA
        </p>
      </footer>
    </div>
  );
}
