import { PublicSiteShell } from "@/components/PublicSiteShell";
import { PUBLIC_SITE_EMAIL } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Консультации — SLINKOV MEDIA",
  description:
    "Консультации по ИИ для авторов, редакций и команд: процессы, тексты, ясность без хайпа.",
  alternates: { canonical: "/ru/consulting" },
};

export default function ConsultingPage() {
  return (
    <PublicSiteShell>
      <div className="public-page">
        <p className="public-eyebrow">(Консультации)</p>
        <h1 className="public-display-title">
          Работа с вами
        </h1>
        <p className="public-lead public-lead-wide">
          Помогаю командам и авторам встроить ИИ в реальную работу — так, чтобы
          остались ясность, голос и ответственность человека. Без обещаний
          «заменить редакцию» и без слайдов ради слайдов.
        </p>

        <div className="public-consult-grid">
          <div>
            <h2 className="public-consult-title">Форматы</h2>
            <ul className="public-plain-list">
              <li>Разовая сессия 90 минут — разбор задачи и следующий шаг</li>
              <li>Пакет из 4 встреч — процесс, промпты, критерии качества</li>
              <li>Внутренний семинар для команды — практика на ваших материалах</li>
            </ul>
          </div>
          <div>
            <h2 className="public-consult-title">О чём обычно говорим</h2>
            <ul className="public-plain-list">
              <li>Где ИИ ускоряет черновик, а где ломает тон</li>
              <li>Как собрать новостной или контентный конвейер</li>
              <li>Как не потерять авторский голос при генерации</li>
              <li>Как проверять факты и оформлять пруфы</li>
            </ul>
          </div>
        </div>

        <a className="public-cta-solid" href={`mailto:${PUBLIC_SITE_EMAIL}`}>
          Запросить консультацию
        </a>
      </div>
    </PublicSiteShell>
  );
}
