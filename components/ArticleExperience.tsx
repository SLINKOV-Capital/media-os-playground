"use client";

import type { DemoTerm } from "@/lib/demoArticle";
import { extractMarkdownToc, slugifyHeading } from "@/lib/demoArticle";
import { MarkdownContent } from "@/components/MarkdownContent";
import Link from "next/link";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import type { Components } from "react-markdown";

export type ArticleLang = "ru" | "en" | "es";

type ArticleExperienceProps = {
  title: string;
  preview: string | null;
  cover: ReactNode;
  breadcrumb: ReactNode;
  contents: Record<ArticleLang, string>;
  terms: DemoTerm[];
  videoYoutubeId?: string | null;
  hasAudio?: boolean;
  hasPresentation?: boolean;
};

function IconVideo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M17 10.5 21 8v8l-4-2.5v-3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconAudio() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 10v4h3l5 4V6L7 10H4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M16 9a3 3 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M18.5 7a5.5 5.5 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconSlides() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 20h8M12 16v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function highlightTermsInText(
  text: string,
  terms: DemoTerm[],
  onOpen: (term: DemoTerm) => void
): ReactNode[] {
  if (!text || terms.length === 0) return [text];

  const sorted = [...terms].sort((a, b) => b.lemma.length - a.lemma.length);
  const pattern = new RegExp(
    `(${sorted.map((t) => t.lemma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );

  const parts = text.split(pattern);
  return parts.map((part, index) => {
    const term = sorted.find(
      (t) => t.lemma.toLowerCase() === part.toLowerCase()
    );
    if (!term) return <span key={index}>{part}</span>;
    return (
      <span
        key={index}
        role="button"
        tabIndex={0}
        className="public-term-mark"
        onClick={() => onOpen(term)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(term);
          }
        }}
        onMouseEnter={() => onOpen(term)}
      >
        {part}
      </span>
    );
  });
}

function mapChildren(
  children: ReactNode,
  terms: DemoTerm[],
  onOpen: (term: DemoTerm) => void
): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return highlightTermsInText(child, terms, onOpen);
    }
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<{
      children?: ReactNode;
      className?: string;
    }>;
    // Avoid re-wrapping already marked terms (button/span nesting / hydration errors)
    if (
      typeof element.props.className === "string" &&
      element.props.className.includes("public-term-mark")
    ) {
      return element;
    }
    if (element.props.children == null) return element;
    return cloneElement(element, {
      children: mapChildren(element.props.children, terms, onOpen),
    });
  });
}

export function ArticleExperience({
  title,
  preview,
  cover,
  breadcrumb,
  contents,
  terms,
  videoYoutubeId,
  hasAudio = true,
  hasPresentation = true,
}: ArticleExperienceProps) {
  const [lang, setLang] = useState<ArticleLang>("ru");
  const [activeTermId, setActiveTermId] = useState<string | null>(
    terms[0]?.id ?? null
  );
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [mobileTermOpen, setMobileTermOpen] = useState(false);
  const [tocPin, setTocPin] = useState<CSSProperties>({});
  const [termsPin, setTermsPin] = useState<CSSProperties>({});

  const layoutRef = useRef<HTMLDivElement>(null);
  const tocRailRef = useRef<HTMLDivElement>(null);
  const termsRailRef = useRef<HTMLDivElement>(null);
  const tocPanelRef = useRef<HTMLElement>(null);
  const termsPanelRef = useRef<HTMLElement>(null);

  const markdown = contents[lang] || contents.ru;
  const toc = useMemo(() => extractMarkdownToc(markdown), [markdown]);
  const activeTerm =
    terms.find((t) => t.id === activeTermId) ?? terms[0] ?? null;
  const highlight = lang === "ru" ? terms : [];
  const showToolbar = Boolean(
    videoYoutubeId ||
      hasAudio ||
      hasPresentation ||
      contents.en.trim() ||
      contents.es.trim()
  );

  const openTerm = (term: DemoTerm) => {
    setActiveTermId(term.id);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1199px)").matches) {
      setMobileTermOpen(true);
    }
  };

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    const tocRail = tocRailRef.current;
    const termsRail = termsRailRef.current;
    const tocPanel = tocPanelRef.current;
    const termsPanel = termsPanelRef.current;
    if (!layout || !tocRail || !termsRail || !tocPanel || !termsPanel) return;

    const pin = () => {
      if (window.innerWidth < 1200) {
        setTocPin({});
        setTermsPin({});
        return;
      }

      const stickTop = 96;
      const layoutBox = layout.getBoundingClientRect();
      const tocRailBox = tocRail.getBoundingClientRect();
      const termsRailBox = termsRail.getBoundingClientRect();
      const tocH = tocPanel.offsetHeight;
      const termsH = termsPanel.offsetHeight;

      const place = (
        railBox: DOMRect,
        panelH: number,
        opts?: { overflow?: string }
      ): CSSProperties => {
        const minTop = layoutBox.top;
        const maxTop = layoutBox.bottom - panelH;
        let top = stickTop;
        if (minTop > stickTop) top = minTop;
        if (top > maxTop) top = Math.max(maxTop, layoutBox.top);
        return {
          position: "fixed",
          top: `${Math.round(top)}px`,
          left: `${Math.round(railBox.left)}px`,
          width: `${Math.round(railBox.width)}px`,
          maxHeight: `${Math.round(window.innerHeight - Math.max(top, 16) - 24)}px`,
          overflow: opts?.overflow ?? "auto",
          zIndex: 40,
        };
      };

      setTocPin(place(tocRailBox, tocH));
      // Terms: panel itself doesn't scroll — gloss stays top, list scrolls inside
      setTermsPin(place(termsRailBox, termsH, { overflow: "hidden" }));
    };

    pin();
    window.addEventListener("scroll", pin, { passive: true });
    window.addEventListener("resize", pin);
    const ro = new ResizeObserver(pin);
    ro.observe(layout);
    ro.observe(tocPanel);
    ro.observe(termsPanel);

    return () => {
      window.removeEventListener("scroll", pin);
      window.removeEventListener("resize", pin);
      ro.disconnect();
    };
  }, [markdown, activeTermId, toc.length]);

  useEffect(() => {
    const ids = toc.map((item) => item.id);
    if (ids.length === 0) return;

    const marker = 88; // just under sticky header

    const updateActive = () => {
      let current = ids[0] ?? null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= marker) {
          current = id;
        }
      }
      setActiveHeadingId(current);
    };

    updateActive();
    // headings mount after markdown paint
    const settle = window.setTimeout(updateActive, 50);
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    window.addEventListener("hashchange", updateActive);

    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
      window.removeEventListener("hashchange", updateActive);
    };
  }, [toc, markdown]);

  const goToHeading = (id: string) => {
    setActiveHeadingId(id);
    const el = document.getElementById(id);
    if (!el) return;
    // Heading tight under header — smaller offset = fewer previous lines visible
    const offset = 80;
    const top = window.scrollY + el.getBoundingClientRect().top - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    window.history.replaceState(null, "", `#${id}`);
  };

  const goToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markdownComponents: Components = {
    h2: ({ children }) => {
      const text = String(children);
      return (
        <h2 id={slugifyHeading(text)}>
          {mapChildren(children, highlight, openTerm)}
        </h2>
      );
    },
    h3: ({ children }) => {
      const text = String(children);
      return (
        <h3 id={slugifyHeading(text)}>
          {mapChildren(children, highlight, openTerm)}
        </h3>
      );
    },
    p: ({ children }) => (
      <p>{mapChildren(children, highlight, openTerm)}</p>
    ),
    li: ({ children }) => (
      <li>{mapChildren(children, highlight, openTerm)}</li>
    ),
    strong: ({ children }) => (
      <strong>{mapChildren(children, highlight, openTerm)}</strong>
    ),
  };

  const tocNav = (
    <nav
      ref={tocPanelRef}
      className="public-article-toc"
      aria-label="Содержание"
      style={tocPin}
    >
      <ol className="public-article-toc-list">
        {toc.map((item) => (
          <li
            key={item.id}
            className={`public-article-toc-item public-article-toc-item--h${item.level}${
              activeHeadingId === item.id ? " is-active" : ""
            }`}
          >
            <a
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                goToHeading(item.id);
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );

  const termsRail = (
    <aside
      ref={termsPanelRef}
      className="public-article-terms"
      aria-label="Термины"
      style={termsPin}
    >
      {activeTerm ? (
        <div className="public-article-term-card">
          <p className="public-article-term-lemma">{activeTerm.lemma}</p>
          <p className="public-article-term-gloss">{activeTerm.gloss}</p>
          {activeTerm.explainedIn ? (
            <p className="public-article-term-source">
              Объясняется в:{" "}
              <Link href={activeTerm.explainedIn.href}>
                {activeTerm.explainedIn.title}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
      <ul className="public-article-terms-list">
        {terms.map((term) => (
          <li key={term.id}>
            <button
              type="button"
              className={`public-article-term-btn${
                activeTermId === term.id ? " is-active" : ""
              }`}
              onClick={() => openTerm(term)}
            >
              {term.lemma}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );

  return (
    <div className="public-article-experience">
      <div ref={layoutRef} className="public-article-layout">
        <div ref={tocRailRef} className="public-article-rail public-article-rail--toc">
          {tocNav}
        </div>

        <article className="public-article">
          {breadcrumb}
          {cover}
          <h1 className="public-article-title">{title}</h1>
          {preview ? <p className="public-article-preview">{preview}</p> : null}

          {showToolbar ? (
            <div
              className="public-article-toolbar"
              role="toolbar"
              aria-label="Форматы и язык"
            >
              <div className="public-article-toolbar-left">
              {videoYoutubeId ? (
                <button
                  type="button"
                  className={`public-article-tool${videoOpen ? " is-active" : ""}`}
                  aria-label="Видео"
                  title="Видео"
                  onClick={() => setVideoOpen((v) => !v)}
                >
                  <IconVideo />
                </button>
              ) : null}
              {hasAudio ? (
                <button
                  type="button"
                  className="public-article-tool"
                  aria-label="Аудио"
                  title="Аудио (скоро)"
                  disabled
                >
                  <IconAudio />
                </button>
              ) : null}
              {hasPresentation ? (
                <button
                  type="button"
                  className="public-article-tool"
                  aria-label="Презентация"
                  title="Презентация (скоро)"
                  disabled
                >
                  <IconSlides />
                </button>
              ) : null}
              </div>

              <div className="public-article-toolbar-right">
              {contents.en.trim() ? (
                <button
                  type="button"
                  className={`public-article-tool public-article-tool--lang${
                    lang === "en" ? " is-active" : ""
                  }`}
                  aria-label="English"
                  title="English"
                  onClick={() => setLang("en")}
                >
                  EN
                </button>
              ) : null}
              {contents.es.trim() ? (
                <button
                  type="button"
                  className={`public-article-tool public-article-tool--lang${
                    lang === "es" ? " is-active" : ""
                  }`}
                  aria-label="Español"
                  title="Español"
                  onClick={() => setLang("es")}
                >
                  ES
                </button>
              ) : null}
              {lang !== "ru" ? (
                <button
                  type="button"
                  className="public-article-tool public-article-tool--lang"
                  aria-label="Русский"
                  title="Русский"
                  onClick={() => setLang("ru")}
                >
                  RU
                </button>
              ) : null}
              </div>
            </div>
          ) : null}

          {videoOpen && videoYoutubeId ? (
            <div className="public-article-video">
              {videoYoutubeId === "demo" ? (
                <div className="public-article-video-placeholder">
                  Здесь будет embed video-Document (YouTube)
                </div>
              ) : (
                <iframe
                  title="Видео к статье"
                  src={`https://www.youtube-nocookie.com/embed/${videoYoutubeId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          ) : null}

          <MarkdownContent
            content={markdown}
            className="public-article-content markdown-content"
            components={markdownComponents}
            typographyLocale={lang === "ru" ? "ru" : undefined}
          />
        </article>

        <div ref={termsRailRef} className="public-article-rail public-article-rail--terms">
          {termsRail}
        </div>
      </div>

      {mobileTermOpen && activeTerm ? (
        <div className="public-article-term-mobile" role="dialog" aria-label="Термин">
          <button
            type="button"
            className="public-article-term-mobile-close"
            onClick={() => setMobileTermOpen(false)}
          >
            ×
          </button>
          <p className="public-article-term-lemma">{activeTerm.lemma}</p>
          <p className="public-article-term-gloss">{activeTerm.gloss}</p>
          {activeTerm.explainedIn ? (
            <p className="public-article-term-source">
              Объясняется в:{" "}
              <Link href={activeTerm.explainedIn.href}>
                {activeTerm.explainedIn.title}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="public-back-top"
        onClick={goToTop}
        aria-label="Наверх"
      >
        Наверх
      </button>
    </div>
  );
}
