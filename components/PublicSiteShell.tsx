import type { ReactNode } from "react";
import Link from "next/link";

type PublicSiteShellProps = {
  children: ReactNode;
};

export function PublicSiteShell({ children }: PublicSiteShellProps) {
  return (
    <div className="public-site">
      <header className="public-site-header">
        <Link href="/" className="public-site-brand">
          Дмитрий Слиньков
        </Link>
      </header>
      <main className="public-site-main">{children}</main>
      <footer className="public-site-footer">
        <p>© {new Date().getFullYear()} Дмитрий Слиньков</p>
      </footer>
    </div>
  );
}
