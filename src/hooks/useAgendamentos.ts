import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Agendamento, Paginated, StatusAgendamento } from "@/types";

type AgendamentoFilters = {
  titulo?: string;
  data?: string;
  status?: StatusAgendamento;
  user_id?: number;
  perpage?: number;
  page?: number;
};

// A API retorna "data" como "DD/MM/YYYY" e "status" capitalizado — normaliza
// para o formato "YYYY-MM-DD" / minúsculo usado no restante do app.
function normalizeAgendamento(a: Agendamento): Agendamento {
  const [dia, mes, ano] = a.data.split("/");
  return {
    ...a,
    data: dia && mes && ano ? `${ano}-${mes}-${dia}` : a.data,
    status: a.status?.toLowerCase() as StatusAgendamento,
  };
}

export function useAgendamentos(filters: AgendamentoFilters = {}) {
  return useQuery({
    queryKey: ["agendamentos", filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Agendamento>>("/agendamentos", {
        params: filters,
      });
      return { ...data, data: data.data.map(normalizeAgendamento) };
    },
  });
}

export type AgendamentoPayload = {
  local_id: number;
  titulo: string;
  data: string;          // YYYY-MM-DD
  hora_inicio: string;   // HH:mm
  hora_final: string;    // HH:mm
  observacoes?: string | null;
  status?: StatusAgendamento;
  ativo: boolean;
};

export function useCreateAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AgendamentoPayload) => {
      const { data } = await api.post<{ data: Agendamento }>("/agendamentos", payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agendamentos"] }),
  });
}

export function useUpdateAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: AgendamentoPayload & { id: number }) => {
      const { data } = await api.put<{ data: Agendamento }>(`/agendamentos/${id}`, payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agendamentos"] }),
  });
}

export function useDeleteAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/agendamentos/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agendamentos"] }),
  });
}
