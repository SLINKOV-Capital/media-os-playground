import Link from "next/link";

export function MobileTopBar() {
  return (
    <header className="mobile-top-bar">
      <Link href="/documents" className="mobile-top-bar-brand">
        Media OS
      </Link>
      <form action="/auth/logout" method="post" className="mobile-top-bar-logout">
        <button type="submit">Выйти</button>
      </form>
    </header>
  );
}
