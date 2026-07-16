import { useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateLocal,
  useDeleteLocal,
  useLocais,
} from "@/hooks/useLocais";
import { hasPermission } from "@/hooks/useAuth";

export default function Locais() {
  const { data: response, isLoading } = useLocais({ perpage: 50 });
  const createLocal = useCreateLocal();
  const deleteLocal = useDeleteLocal();

  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);

  const podeCriar = hasPermission("locais.criar");
  const podeDeletar = hasPermission("locais.deletar");

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await createLocal.mutateAsync({
        nome,
        descricao: descricao || null,
        ativo,
      });
      toast.success("Local criado");
      setOpen(false);
      setNome("");
      setDescricao("");
      setAtivo(true);
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((msg) => toast.error(String(msg)));
      } else {
        toast.error(err?.response?.data?.message ?? "Erro ao criar local");
      }
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este local?")) return;
    try {
      await deleteLocal.mutateAsync(id);
      toast.success("Local excluído");
    } catch (err: any) {
      // Backend impede deletar local com agendamentos
      const msg = err?.response?.data?.erro ?? err?.response?.data?.message ?? "Erro ao excluir";
      toast.error(msg);
    }
  }

  const locais = response?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Locais</h1>
        {podeCriar && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Novo local</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo local</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                  />
                  Ativo
                </label>
                <DialogFooter>
                  <Button type="submit" disabled={createLocal.isPending}>
                    {createLocal.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Ativo</TableHead>
              {podeDeletar && <TableHead className="w-24"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && locais.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum local cadastrado.
                </TableCell>
              </TableRow>
            )}
            {locais.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell className="text-muted-foreground">
                  {l.descricao ?? "—"}
                </TableCell>
                <TableCell>
                  {l.ativo ? (
                    <span className="text-emerald-400">Sim</span>
                  ) : (
                    <span className="text-slate-500">Não</span>
                  )}
                </TableCell>
                {podeDeletar && (
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(l.id)}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
