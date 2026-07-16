import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocais } from "@/hooks/useLocais";
import { useCreateAgendamento } from "@/hooks/useAgendamentos";
import type { StatusAgendamento } from "@/types";
export default function NovoAgendamento() {
  const navigate = useNavigate();
  const { data: locaisResp } = useLocais({ ativo: "1", perpage: 100 });
  const create = useCreateAgendamento();

  const [localId, setLocalId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFinal, setHoraFinal] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<StatusAgendamento>("pendente");
  const locais = locaisResp?.data ?? [];



  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (horaFinal <= horaInicio) {
      toast.error("A hora final deve ser após a hora inicial.");
      return;
    }

    try {
      await create.mutateAsync({
        local_id: Number(localId),
        titulo,
        data,
        hora_inicio: horaInicio,
        hora_final: horaFinal,
        observacoes: observacoes || null,
        status,
        ativo: true,
      });
      toast.success("Agendamento criado");
      navigate("/agendamentos");
    } catch (err: any) {
      // Laravel retorna erros de validação em err.response.data.errors
      const errors = err?.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((msg) => toast.error(String(msg)));
      } else {
        toast.error(err?.response?.data?.message ?? "Erro ao agendar");
      }
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Novo agendamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Select value={localId} onValueChange={setLocalId} required>
                <SelectTrigger id="local">
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
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Reunião de planejamento"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="hora_inicio">Hora início</Label>
                <Input
                  id="hora_inicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_final">Hora final</Label>
                <Input
                  id="hora_final"
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
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Input
                id="obs"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/agendamentos")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Agendar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
