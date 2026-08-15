import { HeroFigure } from "@/components/HeroFigure";
import { WaveText } from "@/components/MotionText";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import {
  HOME_ABOUT_LINKS_ROW1,
  HOME_ABOUT_LINKS_ROW2,
  HOME_SEMINARS,
  HOME_START_HERE,
  HOME_WORKING_ON,
} from "@/lib/publicHome";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SLINKOV MEDIA — Дмитрий Слиньков",
  description:
    "30 лет сдруживаю компьютеры с людьми. ИИ в бизнесе, рассказы, романы, пьесы, семинары.",
  alternates: { canonical: "/ru" },
};

export default function HomePage() {
  return (
    <PublicSiteShell fullBleed>
      <section className="public-hero">
        <div className="public-hero-glow" aria-hidden="true" />

        <div className="public-hero-stage">
          <div className="public-hero-creds">
            <p className="public-hero-name">Дмитрий Слиньков</p>
            <ul className="public-hero-roles">
              <li>ИИ-евангелист</li>
              <li>Бизнес-консультант</li>
              <li>Писатель</li>
            </ul>
          </div>

          <HeroFigure />

          <h1 className="public-hero-wordmark" aria-label="SLINKOV MEDIA">
            <svg
              className="public-hero-wordmark-svg"
              viewBox="0 0 1000 120"
              role="img"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              <text
                x="0"
                y="96"
                className="public-hero-wordmark-text"
                textLength="1000"
                lengthAdjust="spacingAndGlyphs"
              >
                SLINKOV MEDIA
              </text>
            </svg>
          </h1>
        </div>
      </section>

      <section className="public-home-section public-home-about" id="about">
        <h2 className="public-home-label public-home-about-label">(Обо мне)</h2>
        <div className="public-home-about-main">
          <p className="public-home-about-text">
            30 лет сдруживаю компьютеры с людьми. Внедряю искусственный
            интеллект в бизнесе: от корпораций до стартапов. Пишу рассказы,
            романы, пьесы и сценарии. Создаю музыку. Веду семинары по «ИИ в
            бизнесе» и «Корпоративный сторителлинг».
          </p>
          <div className="public-home-about-links">
            <ul className="public-home-about-links-row">
              {HOME_ABOUT_LINKS_ROW1.map((item) => (
                <li key={item.label}>
                  <Link href={item.href}>
                    <WaveText text={item.label} />
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="public-home-about-links-row">
              {HOME_ABOUT_LINKS_ROW2.map((item) => (
                <li key={item.label}>
                  <Link href={item.href}>
                    <WaveText text={item.label} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="public-home-section public-home-start" id="start">
        <h2 className="public-home-label public-home-start-label">
          (Начните отсюда)
        </h2>
        <div className="public-home-start-main">
          <p className="public-home-lead">
            Если вы впервые на моём сайте, этих трёх материалов достаточно,
            чтобы понять, чем я занимаюсь и как думаю.
          </p>
          <ol className="public-home-start-list">
            {HOME_START_HERE.map((item, index) => (
              <li key={item.href}>
                <Link href={item.href} className="public-home-start-item">
                  <span className="public-home-start-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="public-home-start-copy">
                    <span className="public-home-start-title">{item.title}</span>
                    <span className="public-home-start-preview">
                      {item.preview}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="public-home-section" id="working">
        <h2 className="public-home-label">(Над чем сейчас работаю)</h2>
        <ul className="public-home-work-grid">
          {HOME_WORKING_ON.map((item) => (
            <li
              key={item.title}
              className={`public-home-work-card public-home-work-card--${item.size} public-home-work-card--${item.tone}`}
            >
              <div
                className={`public-home-work-media${"image" in item && item.image ? " public-home-work-media--photo" : ""}`}
              >
                {"image" in item && item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 66vw"
                    className="public-home-work-media-img"
                  />
                ) : null}
              </div>
              <p className="public-home-work-title">{item.title}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="public-home-section" id="seminars">
        <h2 className="public-home-label">(Семинары)</h2>
        <ul className="public-home-seminar-grid">
          {HOME_SEMINARS.map((item) => (
            <li key={item.title} className="public-home-seminar-card">
              <h3 className="public-home-seminar-title">{item.title}</h3>
              <p className="public-home-seminar-body">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </PublicSiteShell>
  );
}
