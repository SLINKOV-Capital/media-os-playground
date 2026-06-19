import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";

export function MobileTopBar() {
  return (
    <header className="mobile-top-bar">
      <Link href="/documents" className="mobile-top-bar-brand">
        Media OS
      </Link>
      <MobileMenu />
    </header>
  );
}
