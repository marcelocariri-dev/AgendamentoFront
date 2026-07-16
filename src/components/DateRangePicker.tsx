import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateRangeValue = {
  start: Date | null;
  end: Date | null;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function datePart(d: Date | null): Date | null {
  return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
}

function timePart(d: Date | null, fallback: string): string {
  return d ? format(d, "HH:mm") : fallback;
}

function combine(day: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

// ─── Seletor de intervalo de datas — digitação de data/hora + seleção por
// dois cliques no calendário (1º clique = início, 2º clique = fim) ───────────
export function DateRangePicker({
  value,
  onChange,
  className,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(value.start ?? new Date()));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    const blanks: null[] = Array.from({ length: getDay(start) }, () => null);
    return [...blanks, ...days];
  }, [month]);

  const start = datePart(value.start);
  const end = datePart(value.end);

  // 1º clique (ou clique após um intervalo já completo) define a data inicial;
  // o clique seguinte define a data final (trocando se vier antes do início).
  function handleDayClick(day: Date) {
    if (!start || end) {
      onChange({ start: combine(day, timePart(value.start, "00:00")), end: null });
      return;
    }
    if (isBefore(day, start)) {
      onChange({
        start: combine(day, "00:00"),
        end: combine(start, timePart(value.end, "23:59")),
      });
      return;
    }
    onChange({ start: value.start, end: combine(day, timePart(value.end, "23:59")) });
  }

  function handleStartDate(v: string) {
    if (!v) {
      onChange({ start: null, end: value.end });
      return;
    }
    const [y, m, d] = v.split("-").map(Number);
    onChange({
      start: combine(new Date(y, m - 1, d), timePart(value.start, "00:00")),
      end: value.end,
    });
  }
  function handleEndDate(v: string) {
    if (!v) {
      onChange({ start: value.start, end: null });
      return;
    }
    const [y, m, d] = v.split("-").map(Number);
    onChange({
      start: value.start,
      end: combine(new Date(y, m - 1, d), timePart(value.end, "23:59")),
    });
  }
  function handleStartTime(v: string) {
    if (!value.start) return;
    onChange({ start: combine(value.start, v), end: value.end });
  }
  function handleEndTime(v: string) {
    if (!value.end) return;
    onChange({ start: value.start, end: combine(value.end, v) });
  }

  function clear() {
    onChange({ start: null, end: null });
  }

  const label =
    value.start || value.end
      ? `${value.start ? format(value.start, "dd/MM/yy HH:mm") : "…"} → ${
          value.end ? format(value.end, "dd/MM/yy HH:mm") : "…"
        }`
      : "Período";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
          value.start || value.end
            ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
            : "border-border text-slate-400 hover:bg-muted"
        )}
      >
        <CalendarRange className="h-4 w-4" />
        {label}
      </button>

      {(value.start || value.end) && (
        <button
          type="button"
          onClick={clear}
          title="Limpar período"
          className="absolute -right-2 -top-2 rounded-full border border-border bg-card p-0.5 text-slate-400 transition-colors hover:bg-muted hover:text-rose-400"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[300px] rounded-lg border border-border bg-card p-4 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Início
              </label>
              <input
                type="date"
                value={value.start ? format(value.start, "yyyy-MM-dd") : ""}
                onChange={(e) => handleStartDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-amber-500/50"
              />
              <input
                type="time"
                value={value.start ? format(value.start, "HH:mm") : ""}
                onChange={(e) => handleStartTime(e.target.value)}
                disabled={!value.start}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-amber-500/50 disabled:opacity-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Fim
              </label>
              <input
                type="date"
                value={value.end ? format(value.end, "yyyy-MM-dd") : ""}
                onChange={(e) => handleEndDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-amber-500/50"
              />
              <input
                type="time"
                value={value.end ? format(value.end, "HH:mm") : ""}
                onChange={(e) => handleEndTime(e.target.value)}
                disabled={!value.end}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-amber-500/50 disabled:opacity-40"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="rounded p-1 text-slate-400 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium capitalize text-foreground">
              {format(month, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="rounded p-1 text-slate-400 hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-y-1">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="text-center text-[10px] font-medium text-slate-500">
                {d}
              </span>
            ))}
            {monthDays.map((d, i) => {
              if (!d) return <span key={`b-${i}`} />;
              const isStart = start && isSameDay(d, start);
              const isEnd = end && isSameDay(d, end);
              const inRange =
                start && end && isWithinInterval(d, { start, end }) && !isStart && !isEnd;
              return (
                <div key={d.toISOString()} className="relative py-0.5">
                  {inRange && <span className="absolute inset-y-0.5 left-0 right-0 bg-amber-500/15" />}
                  {isStart && end && (
                    <span className="absolute inset-y-0.5 left-1/2 right-0 bg-amber-500/15" />
                  )}
                  {isEnd && start && (
                    <span className="absolute inset-y-0.5 left-0 right-1/2 bg-amber-500/15" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleDayClick(d)}
                    className={cn(
                      "relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors",
                      isStart || isEnd
                        ? "bg-amber-500 font-semibold text-white"
                        : "text-slate-300 hover:bg-muted"
                    )}
                  >
                    {d.getDate()}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={clear}
              className="text-xs text-slate-500 hover:text-rose-400"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
