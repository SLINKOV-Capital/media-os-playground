"use client";

import { saveWritingStatus, type WritingMinutes } from "@/app/today/actions";
import { LinkifiedText } from "@/components/LinkifiedText";
import {
  addNewsKeyDays, aggregateNewsQueueState, newsChannelStatusSummary,
  newsDateKey, newsQueueVisualState, NEWS_QUEUE_STATE_LABELS,
  type NewsQueueIndicatorItem, type NewsQueueVisualState,
} from "@/lib/newsQueueIndicator";
import type { DailyWritingStatus, NihuyasiEntry } from "@/lib/types";
import Link from "next/link";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import styles from "./TodayDailyMatrix.module.css";

type Popover = {
  kind: "news" | "writing" | "nihuyasi";
  date: string;
  left: number;
  top: number;
  above: boolean;
};

const WRITING_OPTIONS: WritingMinutes[] = [0, 35, 70, 90];

function displayDate(key: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC", weekday: "short", day: "numeric", month: "short",
  }).format(new Date(`${key}T12:00:00Z`));
}

function weekday(key: string) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", weekday: "short" })
    .format(new Date(`${key}T12:00:00Z`)).replace(".", "");
}

function position(button: HTMLButtonElement) {
  const rect = button.getBoundingClientRect();
  const width = Math.min(300, window.innerWidth - 24);
  const above = rect.top >= 190;
  return {
    left: Math.min(window.innerWidth - width - 12, Math.max(12, rect.left + rect.width / 2 - width / 2)),
    top: above ? rect.top - 8 : rect.bottom + 8,
    above,
  };
}

export function TodayDailyMatrix({ newsItems, writingStatuses, nihuyasiEntries, nowIso }: {
  newsItems: NewsQueueIndicatorItem[];
  writingStatuses: DailyWritingStatus[];
  nihuyasiEntries: NihuyasiEntry[];
  nowIso: string;
}) {
  const now = new Date(nowIso);
  const today = newsDateKey(now);
  const days = Array.from({ length: 14 }, (_, index) => addNewsKeyDays(today, index - 7));
  const [writing, setWriting] = useState<Record<string, WritingMinutes>>(
    Object.fromEntries(writingStatuses.map((item) => [item.date, item.minutes]))
  );
  const [popover, setPopover] = useState<Popover | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const newsByDate = new Map<string, NewsQueueIndicatorItem[]>();
  newsItems.forEach((item) => {
    if (!item.aiPick.scheduled_at) return;
    const key = newsDateKey(new Date(item.aiPick.scheduled_at));
    newsByDate.set(key, [...(newsByDate.get(key) ?? []), item]);
  });
  const nihuyasiByDate = new Map<string, NihuyasiEntry[]>();
  nihuyasiEntries.forEach((entry) => {
    nihuyasiByDate.set(entry.date, [...(nihuyasiByDate.get(entry.date) ?? []), entry]);
  });

  function open(kind: Popover["kind"], date: string, button: HTMLButtonElement) {
    setPopover({ kind, date, ...position(button) });
  }

  function openNewsHover(date: string, button: HTMLButtonElement) {
    setPopover((current) => current && current.kind !== "news"
      ? current
      : { kind: "news", date, ...position(button) });
  }

  function chooseWriting(date: string, minutes: WritingMinutes) {
    const previous = writing[date] ?? 0;
    setWriting((current) => ({ ...current, [date]: minutes }));
    setSaveError(null);
    setPopover(null);
    startTransition(async () => {
      const result = await saveWritingStatus(date, minutes);
      if (!result.ok) {
        setWriting((current) => ({ ...current, [date]: previous }));
        setSaveError("Не удалось сохранить отметку «Писал»");
      }
    });
  }

  const newsRows = popover?.kind === "news" ? newsByDate.get(popover.date) ?? [] : [];
  const nihuyasiRows = popover?.kind === "nihuyasi" ? nihuyasiByDate.get(popover.date) ?? [] : [];
  return (
    <section className={styles.matrix} aria-labelledby="today-matrix-title"
      onMouseLeave={() => setPopover((value) => value?.kind === "news" ? null : value)}>
      <div className={styles.header}>
        <h2 id="today-matrix-title" className={styles.title}>Дневная матрица</h2>
        <ul className={styles.legend} aria-label="Статусы новостей">
          {(Object.keys(NEWS_QUEUE_STATE_LABELS) as NewsQueueVisualState[]).map((state) => (
            <li key={state} className={styles.legendItem}>
              <span className={`${styles.legendMark} ${styles[state]}`} aria-hidden="true" />
              {NEWS_QUEUE_STATE_LABELS[state]}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.grid}>
        <div className={styles.labels}>
          <div aria-hidden="true" />
          <div className={styles.rowLabel}>Новости</div>
          <div className={styles.rowLabel}>Писал</div>
          <div className={styles.rowLabel}>Нихуяси</div>
        </div>
        {days.map((key, index) => {
          const items = newsByDate.get(key) ?? [];
          const state = aggregateNewsQueueState(items.map((item) => newsQueueVisualState(item.aiPick, item.publications, now)));
          const minutes = writing[key] ?? 0;
          const fill = minutes === 35 ? 34 : minutes === 70 ? 67 : minutes === 90 ? 100 : 0;
          const entries = nihuyasiByDate.get(key) ?? [];
          return <div key={key} className={`${styles.dayColumn} ${index < 4 || index > 10 ? styles.mobileHidden : ""} ${key === today ? styles.today : ""}`}>
            <div className={styles.dateHeader}>
              <span>{key.slice(-2)}</span><small>{weekday(key)}</small>
            </div>
            <button type="button" className={`${styles.cell} ${state ? styles[state] : ""}`}
              aria-label={`${displayDate(key)}: ${state ? NEWS_QUEUE_STATE_LABELS[state] : "новостей нет"}`}
              onClick={(event) => open("news", key, event.currentTarget)}
              onMouseEnter={(event) => openNewsHover(key, event.currentTarget)}
              onFocus={(event) => open("news", key, event.currentTarget)} onBlur={() => setPopover(null)}>
              {items.length > 1 ? <span className={styles.count}>{items.length}</span> : null}
            </button>
            <button type="button" className={`${styles.cell} ${styles.writingCell}`}
              aria-label={`${displayDate(key)}: писал ${minutes}`} disabled={isPending}
              onClick={(event) => open("writing", key, event.currentTarget)}>
              <span className={styles.writingFill} style={{ height: `${fill}%` }} />
            </button>
            <button type="button" className={`${styles.cell} ${styles.nihuyasiCell}`}
              aria-label={`${displayDate(key)}: Нихуяси ${entries.length}`}
              onClick={(event) => open("nihuyasi", key, event.currentTarget)}>
              {entries.slice(0, 3).map((entry) => <span key={entry.id} className={styles.dot} />)}
              {entries.length > 3 ? <span className={styles.more}>+{entries.length - 3}</span> : null}
            </button>
          </div>;
        })}
      </div>
      {saveError ? <p className={styles.saveError} role="alert">{saveError}</p> : null}

      {popover ? createPortal(
        <div role="dialog" aria-label={displayDate(popover.date)}
          className={`${styles.popover} ${popover.above ? styles.popoverAbove : ""}`}
          style={{ left: popover.left, top: popover.top }}
          onMouseLeave={() => setPopover((value) => value?.kind === "news" ? null : value)}>
          <div className={styles.popoverDate}>{displayDate(popover.date)}</div>
          {popover.kind === "news" && (newsRows.length ? <ul className={styles.popoverList}>
            {newsRows.map((item) => {
              const state = newsQueueVisualState(item.aiPick, item.publications, now);
              return <li key={item.aiPick.id}><strong>{item.aiPick.title_ru || "Без заголовка"}</strong>
                <span>{NEWS_QUEUE_STATE_LABELS[state]}</span>
                {(state === "published" || state === "error") ? <span>{newsChannelStatusSummary(item.aiPick, item.publications)}</span> : null}
              </li>;
            })}
          </ul> : <p className={styles.muted}>Новостей нет</p>)}
          {popover.kind === "writing" && <div className={styles.writingOptions}>
            {WRITING_OPTIONS.map((minutes) => <button type="button" key={minutes}
              className={(writing[popover.date] ?? 0) === minutes ? styles.selectedOption : ""}
              onClick={() => chooseWriting(popover.date, minutes)}>{minutes}</button>)}
          </div>}
          {popover.kind === "nihuyasi" && <>
            {nihuyasiRows.length ? <ul className={styles.popoverList}>
              {nihuyasiRows.map((entry) => <li key={entry.id}><LinkifiedText text={entry.text} /></li>)}
            </ul> : <p className={styles.muted}>Событий нет</p>}
            <Link className={styles.nihuyasiLink} href="/nihuyasi">Открыть Нихуяси</Link>
          </>}
        </div>, document.body
      ) : null}
    </section>
  );
}
