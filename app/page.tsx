import Link from "next/link";

export default function HomePage() {
  return (
    <div className="landing">
      <main>
        <h1>Media OS</h1>
        <p className="subtitle">Человек и ИИ: разжёванное сложное</p>
        <p className="tagline">
          Если вы не нашли место, где всё наконец-то разжевали — создайте его
          сами.
        </p>
        <Link href="/login" className="enter">
          Cockpit →
        </Link>
      </main>
    </div>
  );
}
