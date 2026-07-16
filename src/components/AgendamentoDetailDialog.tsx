import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User as UserIcon,
  FileText,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getCurrentUser, hasPermission, isAdmin } from "@/hooks/useAuth";
import { useLocais } from "@/hooks/useLocais";
import { useUpdateAgendamento } from "@/hooks/useAgendamentos";
import type { Agendamento, StatusAgendamento } from "@/types";

// Mesma paleta usada na página de Agendamentos, para manter consistência visual
const STATUS_PILL: Record<StatusAgendamento, string> = {
  confirmado: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  pendente: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  cancelado: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
};

const STATUS_LABEL: Record<StatusAgendamento, string> = {
  confirmado: "Confirmado",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

function formatHora(hora?: string) {
  if (!hora) return "—";
  return hora.length > 5 ? hora.slice(0, 5) : hora;
}

function formatDataLonga(data?: string) {
  if (!data) return "—";
  try {
    // data chega como "YYYY-MM-DD"
    const d = parse(data, "yyyy-MM-dd", new Date());
    return format(d, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return data;
  }
}

// Uma linha de informação com ícone + rótulo + valor
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

type Props = {
  agendamento: Agendamento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podeCancelar?: boolean;
  onCancelar?: (a: Agendamento) => void;
  initialMode?: "view" | "edit";
};

export default function AgendamentoDetailDialog({
  agendamento,
  open,
  onOpenChange,
  podeCancelar = false,
  onCancelar,
  initialMode = "view",
}: Props) {
  const { data: locaisResp } = useLocais({ ativo: "1", perpage: 100 });
  const locais = locaisResp?.data ?? [];
  const updateAgendamento = useUpdateAgendamento();

  const [isEditing, setIsEditing] = useState(initialMode === "edit");
  const [localId, setLocalId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFinal, setHoraFinal] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<StatusAgendamento>("pendente");

  // Sempre que o agendamento exibido muda (ou o dialog reabre), volta para o
  // modo inicial pedido e repopula os campos do formulário com os dados atuais.
  useEffect(() => {
    if (!agendamento || !open) return;
    setIsEditing(initialMode === "edit");
    setLocalId(String(agendamento.local_id));
    setTitulo(agendamento.titulo);
    setData(agendamento.data);
    setHoraInicio(formatHora(agendamento.hora_inicio));
    setHoraFinal(formatHora(agendamento.hora_final));
    setObservacoes(agendamento.observacoes ?? "");
    setStatus(agendamento.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamento?.id, open, initialMode]);

  if (!agendamento) return null;

  const a = agendamento;
  const podeMostrarCancelar =
    podeCancelar && onCancelar && a.status !== "cancelado";
    const user = getCurrentUser();
    const EhDonoOudmin = isAdmin() || user?.id === a.user?.id;
    const PermissãoParaEditar = hasPermission("agendamentos.editar");
    const podeEditar = EhDonoOudmin && PermissãoParaEditar;
  console.log("=== DEBUG editar ===");
  console.log("getCurrentUser() completo:", a.user);
  console.log("user?.id:", a.user?.id);
  console.log("a.user completo:", a.user);
  console.log("a.user?.id:", a.user?.id);
  console.log("podeEditar:", podeEditar);

  async function handleSalvar() {
    if (horaFinal <= horaInicio) {
      toast.error("A hora final deve ser após a hora inicial.");
      return;
    }
    try {
      await updateAgendamento.mutateAsync({
        id: a.id,
        local_id: Number(localId),
        titulo,
        data,
        hora_inicio: horaInicio,
        hora_final: horaFinal,
        observacoes: observacoes || null,
        status,
        ativo: a.ativo,
      });
      toast.success("Agendamento atualizado");
      setIsEditing(false);
      onOpenChange(false);
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((msg) => toast.error(String(msg)));
      } else {
        toast.error(err?.response?.data?.message ?? "Erro ao atualizar agendamento");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-xl">
              {isEditing ? "Editar agendamento" : a.titulo}
            </DialogTitle>
            {!isEditing && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  STATUS_PILL[a.status]
                )}
              >
                {STATUS_LABEL[a.status]}
              </span>
            )}
          </div>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-local">Local</Label>
              <Select value={localId} onValueChange={setLocalId}>
                <SelectTrigger id="edit-local" className="w-full">
                  <SelectValue placeholder="Selecione um local" />
                </SelectTrigger>
                <SelectContent>
                  {locais.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-titulo">Título</Label>
              <Input
                id="edit-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-data">Data</Label>
              <Input
                id="edit-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-hora-inicio">Hora início</Label>
                <Input
                  id="edit-hora-inicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-hora-final">Hora final</Label>
                <Input
                  id="edit-hora-final"
                  type="time"
                  value={horaFinal}
                  onChange={(e) => setHoraFinal(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as StatusAgendamento)}
              >
                <SelectTrigger id="edit-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-obs">Observações (opcional)</Label>
              <Input
                id="edit-obs"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <InfoRow
              icon={CalendarIcon}
              label="Data"
              value={<span className="capitalize">{formatDataLonga(a.data)}</span>}
            />

            <InfoRow
              icon={Clock}
              label="Horário"
              value={`${formatHora(a.hora_inicio)} às ${formatHora(a.hora_final)}`}
            />

            <InfoRow
              icon={MapPin}
              label="Local"
              value={a.local?.nome ?? "—"}
            />

            {a.user?.name && (
              <InfoRow icon={UserIcon} label="Responsável" value={a.user.name} />
            )}

            {a.observacoes && (
              <InfoRow
                icon={FileText}
                label="Observações"
                value={a.observacoes}
              />
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar edição
              </Button>
              <Button onClick={handleSalvar} disabled={updateAgendamento.isPending}>
                {updateAgendamento.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {podeEditar && (
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
              {podeMostrarCancelar && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    onCancelar!(a);
                    onOpenChange(false);
                  }}
                >
                  Cancelar agendamento
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
