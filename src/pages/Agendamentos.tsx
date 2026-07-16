import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  dateFnsLocalizer,
  type NavigateAction,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  List as ListIcon,
  MapPin,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateRangePicker, type DateRangeValue } from "@/components/DateRangePicker";
import { useAgendamentos, useUpdateAgendamento } from "@/hooks/useAgendamentos";
import { useLocais } from "@/hooks/useLocais";
import { getCurrentUser, hasPermission, isAdmin } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { Agendamento, Local, StatusAgendamento } from "@/types";
import AgendamentoDetailDialog from "@/components/AgendamentoDetailDialog";

// ─── Localizer — conecta o RBC ao date-fns ───────────────────────────────────
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales: { "pt-BR": ptBR },
});

// ─── Tipo do evento que o RBC entende ────────────────────────────────────────
type CalEvent = {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: Agendamento;
};

function parseAgendamentoDateTime(dataStr: string, horaStr: string): Date {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const [h = 0, m = 0] = horaStr.split(":").map(Number);
  return new Date(ano, mes - 1, dia, h, m);
}

function toCalEvents(agendamentos: Agendamento[]): CalEvent[] {
  return agendamentos.map((a) => ({
    id: a.id,
    title: a.titulo,
    start: parseAgendamentoDateTime(a.data, a.hora_inicio),
    end: parseAgendamentoDateTime(a.data, a.hora_final),
    resource: a,
  }));
}

// ─── Mapas de estilo por status (paleta navy/laranja) ────────────────────────
const STATUS_DOT: Record<StatusAgendamento, string> = {
  confirmado: "bg-emerald-400",
  pendente: "bg-amber-400",
  cancelado: "bg-rose-400",
};
const STATUS_PILL: Record<StatusAgendamento, string> = {
  confirmado: "bg-emerald-500/15 text-emerald-300",
  pendente: "bg-amber-500/15 text-amber-300",
  cancelado: "bg-rose-500/15 text-rose-300",
};
const STATUS_BAR: Record<StatusAgendamento, string> = {
  confirmado: "bg-emerald-500",
  pendente: "bg-amber-500",
  cancelado: "bg-rose-500",
};

const STATUS_FILTER_OPTIONS: { label: string; value: "todos" | StatusAgendamento }[] = [
  { label: "Todos", value: "todos" },
  { label: "Ativos", value: "confirmado" },
  { label: "Pendente", value: "pendente" },
  { label: "Cancelado", value: "cancelado" },
];

const ROOM_DOT_COLORS = [
  "bg-amber-400",
  "bg-blue-400",
  "bg-emerald-400",
  "bg-purple-400",
  "bg-rose-400",
  "bg-cyan-400",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WORK_HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 7h..19h

function formatHora(hora: string) {
  return hora.length > 5 ? hora.slice(0, 5) : hora;
}

function formatDataCurta(data: string) {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

function formatDuracao(inicio: string, fim: string) {
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  const mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

// ─── Toolbar da visão calendário ─────────────────────────────────────────────
function CalendarToolbar({
  label,
  onNavigate,
}: {
  label: string;
  onNavigate: (action: NavigateAction) => void;
}) {
  return (
    <div className="shrink-0 bg-card border-b border-border px-6 pt-4 pb-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center border border-border rounded-md">
          <button
            onClick={() => onNavigate("PREV")}
            className="px-2 py-1.5 hover:bg-muted transition-colors rounded-l"
          >
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          </button>
          <span className="px-3 text-sm font-medium text-foreground min-w-[148px] text-center capitalize select-none">
            {label}
          </span>
          <button
            onClick={() => onNavigate("NEXT")}
            className="px-2 py-1.5 hover:bg-muted transition-colors rounded-r"
          >
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-5 text-[11px]">
          {(
            [
              { label: "CONFIRMADO", status: "confirmado" },
              { label: "PENDENTE", status: "pendente" },
              { label: "CANCELADO", status: "cancelado" },
            ] as const
          ).map(({ label, status }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[status])} />
              <span className="text-slate-500 tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomEvent({ event }: { event: CalEvent }) {
  const a = event.resource;
  return (
    <div
      title={`${a.titulo} — ${formatHora(a.hora_inicio)} às ${formatHora(a.hora_final)}${a.local ? ` · ${a.local.nome}` : ""}`}
      className={cn(
        "flex items-center gap-1 rounded px-1 py-[1px] text-[11px] leading-[1.4] w-full",
        STATUS_PILL[a.status]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[a.status])} />
      <span className="truncate">
        {formatHora(a.hora_inicio)} {a.titulo}
      </span>
    </div>
  );
}

const messages = {
  showMore: (total: number) => `+${total} mais`,
  noEventsInRange: "Nenhum evento neste período.",
};

const formats = {
  monthHeaderFormat: (date: Date) =>
    format(date, "MMMM 'de' yyyy", { locale: ptBR }),
  weekdayFormat: (date: Date) =>
    format(date, "EEE", { locale: ptBR }).replace(".", "").toUpperCase(),
};

// ─── Painel lateral: mini calendário + horário + resumo + salas ─────────────
function SidePanel({
  calendarMonth,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  datesWithEvents,
  selectedHours,
  onToggleHour,
  agendamentosDoDia,
  locais,
}: {
  calendarMonth: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  datesWithEvents: Set<string>;
  selectedHours: Set<number>;
  onToggleHour: (h: number) => void;
  agendamentosDoDia: Agendamento[];
  locais: Local[];
}) {
  const monthDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const startPad = getDay(start);
    const blanks: null[] = Array.from({ length: startPad }, () => null);
    return [...blanks, ...days];
  }, [calendarMonth]);

  const total = agendamentosDoDia.length;
  const confirmados = agendamentosDoDia.filter((a) => a.status === "confirmado").length;
  const pendentes = agendamentosDoDia.filter((a) => a.status === "pendente").length;
  const cancelados = agendamentosDoDia.filter((a) => a.status === "cancelado").length;

  const salasComContagem = locais.map((l, i) => ({
    local: l,
    count: agendamentosDoDia.filter((a) => a.local_id === l.id).length,
    dot: ROOM_DOT_COLORS[i % ROOM_DOT_COLORS.length],
  }));

  return (
    <aside className="w-72 shrink-0 border-r border-border overflow-y-auto p-4 space-y-6">
      {/* Mini calendário */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground capitalize">
            {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevMonth}
              className="p-1 rounded hover:bg-muted text-slate-400 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={onNextMonth}
              className="p-1 rounded hover:bg-muted text-slate-400 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {WEEKDAYS.map((d) => (
            <span
              key={d}
              className="text-[10px] font-medium text-slate-500 text-center"
            >
              {d}
            </span>
          ))}
          {monthDays.map((d, i) => {
            if (!d) return <span key={`blank-${i}`} />;
            const key = format(d, "yyyy-MM-dd");
            const selected = isSameDay(d, selectedDate);
            const today = isToday(d);
            const hasEvents = datesWithEvents.has(key);
            return (
              <button
                key={key}
                onClick={() => onSelectDate(d)}
                className={cn(
                  "relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors",
                  selected
                    ? "bg-amber-500 text-white font-semibold"
                    : today
                    ? "text-amber-400 font-semibold ring-1 ring-amber-500/50"
                    : "text-slate-300 hover:bg-muted"
                )}
              >
                {getDate(d)}
                {hasEvents && !selected && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horário */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Horário
          </span>
          <span className="text-[11px] text-amber-400">07:00 - 20:00</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {WORK_HOURS.map((h) => {
            const active = selectedHours.has(h);
            return (
              <button
                key={h}
                onClick={() => onToggleHour(h)}
                className={cn(
                  "rounded-md border px-1.5 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-border text-slate-500 hover:bg-muted"
                )}
              >
                {h}h
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumo do dia */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Resumo do dia
        </span>
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total</span>
            <span className="font-medium text-foreground">{total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Confirmados</span>
            <span className="font-medium text-emerald-400">{confirmados}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Pendentes</span>
            <span className="font-medium text-amber-400">{pendentes}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Cancelados</span>
            <span className="font-medium text-rose-400">{cancelados}</span>
          </div>
        </div>
      </div>

      {/* Salas */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Salas
        </span>
        <div className="mt-2 space-y-1.5">
          {salasComContagem.map(({ local, count, dot }) => (
            <div key={local.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                <span className="text-slate-300 truncate">{local.nome}</span>
              </span>
              <span className="text-slate-500 shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ─── Card de agendamento na visão lista ──────────────────────────────────────
function AppointmentCard({
  a,
  podeCancelar,
  onCancelar,
  mostrarData,
  onAbrirDetalhe,
  onEditar,
}: {
  a: Agendamento;
  podeCancelar: boolean;
  onCancelar: (a: Agendamento) => void;
    mostrarData?: boolean;
    onAbrirDetalhe: (a: Agendamento) => void;
    onEditar: (a: Agendamento) => void;
}) {
  const duracao = formatDuracao(a.hora_inicio, a.hora_final);
  const user = getCurrentUser();
  const EhDonoOudmin = isAdmin() || user?.id === a.user?.id;
  const PermissãoParaEditar = hasPermission("agendamentos.editar");
  const podeEditar = EhDonoOudmin && PermissãoParaEditar;
  return (
    <div
      onClick={() => onAbrirDetalhe(a)}
      className="relative flex cursor-pointer gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-amber-500/40"
    >
      <span className={cn("absolute left-0 top-0 bottom-0 w-1", STATUS_BAR[a.status])} />

      <div className="flex w-14 shrink-0 flex-col items-start pl-2">
        {mostrarData && (
          <span className="text-[10px] font-semibold uppercase text-amber-400">
            {formatDataCurta(a.data)}
          </span>
        )}
        <span className="text-base font-semibold text-foreground">
          {formatHora(a.hora_inicio)}
        </span>
        <span className="text-xs text-slate-500">{formatHora(a.hora_final)}</span>
      </div>

      <div className="w-px shrink-0 self-stretch bg-border" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-medium text-foreground">{a.titulo}</h3>
            {a.user && (
              <p className="truncate text-sm text-slate-400">{a.user.name}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
                STATUS_PILL[a.status]
              )}
            >
              {a.status}
       
            </span>

            {podeEditar && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditar(a);
                }}
                title="Editar agendamento"
                className="rounded-full p-1 text-slate-500 transition-colors hover:bg-amber-500/15 hover:text-amber-400"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {podeCancelar && a.status !== "cancelado" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelar(a);
                }}
                title="Cancelar agendamento"
                className="rounded-full p-1 text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          {a.local && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {a.local.nome}
            </span>
          )}
          {duracao && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {duracao}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Visão lista (dia selecionado) ───────────────────────────────────────────
function ListaView({
  selectedDate,
  onToday,
  onPrevDay,
  onNextDay,
  agendamentosDoDia,
  agendamentosFiltrados,
  podeCancelar,
  onCancelar,
  rangeAtivo,
  periodoLabel,
  onAbrirDetalhe,
  onEditar,
}: {
  selectedDate: Date;
  onToday: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  agendamentosDoDia: Agendamento[];
  agendamentosFiltrados: Agendamento[];
  podeCancelar: boolean;
  onCancelar: (a: Agendamento) => void;
  rangeAtivo?: boolean;
    periodoLabel?: string;
    onAbrirDetalhe: (a: Agendamento) => void;
    onEditar: (a: Agendamento) => void;
}) {
  const hoje = isToday(selectedDate);
  const ordenados = [...agendamentosDoDia].sort((a, b) =>
    (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio)
  );
  const rangeLabel =
    ordenados.length > 0
      ? `${formatHora(ordenados[0].hora_inicio)}-${formatHora(ordenados[ordenados.length - 1].hora_final)}`
      : null;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {rangeAtivo
              ? "Período selecionado"
              : hoje
              ? "Hoje"
              : format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {agendamentosDoDia.length} agendamento{agendamentosDoDia.length !== 1 ? "s" : ""}
            {rangeAtivo && periodoLabel ? ` · ${periodoLabel}` : rangeLabel ? ` · ${rangeLabel}` : ""}
          </p>
        </div>

        {!rangeAtivo && (
          <div className="flex items-center gap-2">
            <button
              onClick={onToday}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                hoje
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                  : "border-border text-slate-400 hover:bg-muted"
              )}
            >
              Hoje
            </button>
            <div className="flex items-center border border-border rounded-md">
              <button
                onClick={onPrevDay}
                className="p-1.5 hover:bg-muted transition-colors text-slate-400 rounded-l"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={onNextDay}
                className="p-1.5 hover:bg-muted transition-colors text-slate-400 rounded-r"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {agendamentosFiltrados.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-500">
            {rangeAtivo
              ? "Nenhum agendamento encontrado neste período."
              : "Nenhum agendamento encontrado para este dia."}
          </p>
        )}
        {agendamentosFiltrados
          .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio))
          .map((a) => (
            <AppointmentCard
              key={a.id}
              a={a}
              podeCancelar={podeCancelar}
              onCancelar={onCancelar}
              mostrarData={rangeAtivo}
              onAbrirDetalhe={onAbrirDetalhe}
              onEditar={onEditar}
            />
          ))}
      </div>
    </div>
  );
}


// ─── Barra superior: busca + toggle de visão + novo agendamento ─────────────
function PageToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
  pageMode,
  onPageModeChange,
  podeCriar,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: "todos" | StatusAgendamento;
  onStatusFilterChange: (v: "todos" | StatusAgendamento) => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (v: DateRangeValue) => void;
  pageMode: "lista" | "calendario";
  onPageModeChange: (m: "lista" | "calendario") => void;
  podeCriar: boolean;
}) {
  return (
    <div className="shrink-0 flex items-center gap-3 border-b border-border bg-card px-6 py-3">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar reunião, sala ou pessoa..."
          className="w-full rounded-md border border-border bg-background px-3 py-2 pl-9 text-sm text-foreground placeholder:text-slate-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as "todos" | StatusAgendamento)}
        className="rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
      >
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <DateRangePicker value={dateRange} onChange={onDateRangeChange} />

      <div className="ml-auto flex items-center overflow-hidden rounded-md border border-border">
        <button
          onClick={() => onPageModeChange("lista")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
            pageMode === "lista"
              ? "bg-amber-500/15 text-amber-400"
              : "text-slate-400 hover:bg-muted"
          )}
        >
          <ListIcon className="h-4 w-4" />
          Lista
        </button>
        <button
          onClick={() => onPageModeChange("calendario")}
          className={cn(
            "flex items-center gap-1.5 border-l border-border px-3 py-2 text-sm font-medium transition-colors",
            pageMode === "calendario"
              ? "bg-amber-500/15 text-amber-400"
              : "text-slate-400 hover:bg-muted"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Calendário
        </button>
      </div>

      {podeCriar && (
        <Button
          asChild
          className="h-[38px] gap-1.5 bg-amber-500 px-3 text-white hover:bg-amber-600 active:bg-amber-700"
        >
          <Link to="/agendamentos/novo">
            <Plus className="h-4 w-4" />
            Novo agendamento
          </Link>
        </Button>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────
export default function Agendamentos() {
  const podeCriar = hasPermission("agendamentos.criar");
  const podeCancelar = hasPermission("agendamentos.editar");
  const updateAgendamento = useUpdateAgendamento();
  const [detalheAberto, setDetalheAberto] = useState<Agendamento | null>(null);
  const [modoDetalhe, setModoDetalhe] = useState<"view" | "edit">("view");
  const [pageMode, setPageMode] = useState<"lista" | "calendario">("lista");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | StatusAgendamento>("todos");
  const [dateRange, setDateRange] = useState<DateRangeValue>({ start: null, end: null });
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedHours, setSelectedHours] = useState<Set<number>>(
    () => new Set(WORK_HOURS)
  );

  const { data: response, isLoading } = useAgendamentos({ perpage: 500 });
  const agendamentos = response?.data ?? [];
  const { data: locaisResp } = useLocais({ perpage: 100 });
  const locais = locaisResp?.data ?? [];

  const searchLower = search.trim().toLowerCase();
  const rangeAtivo = Boolean(dateRange.start || dateRange.end);
  const filteredAgendamentos = useMemo(() => {
    return agendamentos.filter((a) => {
      if (statusFilter !== "todos" && a.status !== statusFilter) return false;
      if (dateRange.start || dateRange.end) {
        const inicio = parseAgendamentoDateTime(a.data, a.hora_inicio);
        const fim = parseAgendamentoDateTime(a.data, a.hora_final);
        if (dateRange.start && isBefore(fim, dateRange.start)) return false;
        if (dateRange.end && isAfter(inicio, dateRange.end)) return false;
      }
      if (!searchLower) return true;
      return (
        a.titulo.toLowerCase().includes(searchLower) ||
        a.local?.nome.toLowerCase().includes(searchLower) ||
        a.user?.name.toLowerCase().includes(searchLower)
      );
    });
  }, [agendamentos, searchLower, statusFilter, dateRange]);
  function abrirDetalhe(a: Agendamento) {
    setModoDetalhe("view");
    setDetalheAberto(a);
  }
  function abrirEdicao(a: Agendamento) {
    setModoDetalhe("edit");
    setDetalheAberto(a);
  }
  const periodoLabel = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return "";
    const ini = dateRange.start ? format(dateRange.start, "dd/MM/yy HH:mm") : "…";
    const fim = dateRange.end ? format(dateRange.end, "dd/MM/yy HH:mm") : "…";
    return `${ini} → ${fim}`;
  }, [dateRange]);

  const agendamentosNoPeriodo = useMemo(
    () =>
      [...filteredAgendamentos].sort((a, b) =>
        (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio)
      ),
    [filteredAgendamentos]
  );

  async function handleCancelar(a: Agendamento) {

    console.log("=== handleCancelar FOI CHAMADO ===");
  console.log("Agendamento recebido:", a);
  console.log("local_id:", a.local_id);
  console.log("local?.id:", a.local?.id);
    if (!confirm(`Cancelar o agendamento "${a.titulo}"?`)) return;
    try { 
      await updateAgendamento.mutateAsync({
        id: a.id,
        local_id: a.local?.id || a.local_id,
        titulo: a.titulo,
        data: a.data,
        hora_inicio: a.hora_inicio?.slice(0,5),
        hora_final: a.hora_final?.slice(0,5),
        observacoes: a.observacoes,
        ativo: a.ativo,
        status: "cancelado",
      }); console.log("Agendamento completo:", a);
      toast.success("Agendamento cancelado");
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((msg) => toast.error(String(msg)));
      } else { console.log("Agendamento completo:", a);
        toast.error(err?.response?.data?.message ?? "Erro ao cancelar agendamento");
      }
    }
  }

  const events = useMemo(() => toCalEvents(filteredAgendamentos), [filteredAgendamentos]);

  const datesWithEvents = useMemo(() => {
    const s = new Set<string>();
    filteredAgendamentos.forEach((a) => s.add(a.data));
    return s;
  }, [filteredAgendamentos]);

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const agendamentosDoDia = useMemo(
    () => filteredAgendamentos.filter((a) => a.data === dateKey),
    [filteredAgendamentos, dateKey]
  );
  const agendamentosFiltrados = useMemo(
    () => {
      const tudoMarcado = WORK_HOURS.every(h => selectedHours.has(h));
      if (tudoMarcado) return agendamentosDoDia;
      return agendamentosDoDia.filter((a) => {
        const [h] = a.hora_inicio.split(":").map(Number);
        return selectedHours.has(h);
      });
      } , [agendamentosDoDia, selectedHours]
  );

  function selectDate(d: Date) {
    setSelectedDate(d);
    setCalendarMonth(startOfMonth(d));
  }
  function toggleHour(h: number) {
    setSelectedHours((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  return (
    <div className="relative -m-6 flex h-full flex-col overflow-hidden bg-background">
      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        pageMode={pageMode}
        onPageModeChange={setPageMode}
        podeCriar={podeCriar}
      />
    <AgendamentoDetailDialog
    agendamento={detalheAberto}
    open={detalheAberto !== null}
    initialMode={modoDetalhe}
   onOpenChange={(open) => {
    if (!open) setDetalheAberto(null);
  }}
  podeCancelar={podeCancelar}
  onCancelar={handleCancelar}
/>
      {pageMode === "lista" ? (
        <div className="flex min-h-0 flex-1">
          <SidePanel
            calendarMonth={calendarMonth}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
            onPrevMonth={() => setCalendarMonth((m) => subMonths(m, 1))}
            onNextMonth={() => setCalendarMonth((m) => addMonths(m, 1))}
            datesWithEvents={datesWithEvents}
            selectedHours={selectedHours}
            onToggleHour={toggleHour}
            agendamentosDoDia={agendamentosDoDia}
            locais={locais}
          />
          <ListaView
            selectedDate={selectedDate}
            onToday={() => selectDate(new Date())}
            onPrevDay={() => selectDate(subDays(selectedDate, 1))}
            onNextDay={() => selectDate(addDays(selectedDate, 1))}
            agendamentosDoDia={rangeAtivo ? agendamentosNoPeriodo : agendamentosDoDia}
            agendamentosFiltrados={rangeAtivo ? agendamentosNoPeriodo : agendamentosFiltrados}
            podeCancelar={podeCancelar}
            onCancelar={handleCancelar}
            rangeAtivo={rangeAtivo}
            periodoLabel={periodoLabel}
            onAbrirDetalhe={abrirDetalhe}
            onEditar={abrirEdicao}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <Calendar<CalEvent>
            localizer={localizer}
            events={events}
            date={calendarDate}
            view="month"
            onNavigate={setCalendarDate}
            culture="pt-BR"
            messages={messages}
            formats={formats}
            style={{ height: "100%" }}
            eventPropGetter={() => ({
              style: { background: "transparent", border: "none", padding: 0 },
            })}
            components={{
              toolbar: (props: any) => (
                <CalendarToolbar label={props.label} onNavigate={props.onNavigate} />
              ),
              event: (props: any) => <CustomEvent event={props.event} />,
            }}
            popup
          />
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70">
          <span className="text-sm text-slate-400">Carregando...</span>
        </div>
      )}
    </div>
  );
}
