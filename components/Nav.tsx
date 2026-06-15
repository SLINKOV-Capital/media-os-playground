import Link from "next/link";

export function Nav() {
  return (
    <nav className="nav">
      <Link href="/today" className="nav-brand">
        Media OS Cockpit
      </Link>
      <div className="nav-actions">
        <Link href="/today" className="nav-link">
          Сегодня
        </Link>
        <Link href="/documents" className="nav-link">
          Документы
        </Link>
        <Link href="/templates" className="nav-link">
          Шаблоны
        </Link>
        <form action="/auth/logout" method="post" className="logout-form">
          <button type="submit">Выйти</button>
        </form>
      </div>
    </nav>
  );
}
