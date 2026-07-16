import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Local, Paginated } from "@/types";

type LocaisFilters = {
  nome?: string;
  ativo?: boolean | "0" | "1";
  perpage?: number;
  page?: number;
};

export function useLocais(filters: LocaisFilters = {}) {
  return useQuery({
    queryKey: ["locais", filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Local>>("/locais", {
        params: filters,
      });
      return data;
    },
  });
}

export function useLocal(id: number | null) {
  return useQuery({
    queryKey: ["locais", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<{ data: Local }>(`/locais/${id}`);
      // Pode vir { data: Local } (Resource) ou Local direto. Normaliza.
      return (data as any).data ?? (data as unknown as Local);
    },
  });
}

export type LocalPayload = {
  nome: string;
  descricao?: string | null;
  ativo: boolean;
};

export function useCreateLocal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LocalPayload) => {
      const { data } = await api.post<{ data: Local }>("/locais", payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locais"] }),
  });
}

export function useUpdateLocal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: LocalPayload & { id: number }) => {
      const { data } = await api.put<{ data: Local }>(`/locais/${id}`, payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locais"] }),
  });
}

export function useDeleteLocal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/locais/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locais"] }),
  });
}
