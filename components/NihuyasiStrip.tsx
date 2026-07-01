import { buildNihuyasiStrip } from "@/lib/format";
import type { NihuyasiEntry } from "@/lib/types";

type NihuyasiStripProps = {
  entries: Pick<NihuyasiEntry, "date">[];
  days?: number;
};

export function NihuyasiStrip({ entries, days = 30 }: NihuyasiStripProps) {
  const strip = buildNihuyasiStrip(entries, days);
  const missingCount = strip.filter((day) => !day.hasEntry).length;

  return (
    <div className="nihuyasi-strip">
      <div className="nihuyasi-strip-cells">
        {strip.map((day) => {
          const stateClass = day.hasEntry ? " is-filled" : " is-empty";
          const todayClass = day.isToday ? " is-today" : "";
          const title = day.hasEntry
            ? `${day.label} — есть нихуяся`
            : `${day.label} — пусто`;

          return (
            <span
              key={day.date}
              className={`nihuyasi-strip-cell${stateClass}${todayClass}`}
              title={title}
              aria-label={title}
            />
          );
        })}
      </div>
      <p className="nihuyasi-strip-meta">
        {missingCount === 0
          ? `Последние ${days} дней без пропусков`
          : `Пустых дней за ${days} дней: ${missingCount}`}
      </p>
    </div>
  );
}
