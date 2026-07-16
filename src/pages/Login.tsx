import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLogin } from "@/hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const login = useLogin();

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      navigate("/agendamentos");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Credenciais inválidas";
      toast.error(msg);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Lado esquerdo: ilustração (só desktop) */}
      <div className="hidden w-full items-center justify-center bg-sidebar md:flex">
        <img
          className="max-w-xl"
          src="https://softcom.areaclientes.com.br/images/screen/login.svg"
          alt="loginImage"
        />
      </div>

      {/* Lado direito: formulário */}
      <div className="flex w-full flex-col items-center justify-center bg-background p-4">
        <div className="mb-6 flex justify-center">
          <img
            className="w-40"
            src="https://softcom.areaclientes.com.br/images/logo/logo.png"
            alt="Softcom"
          />
        </div>

        <Card className="w-full max-w-md border-border px-8 py-10 shadow-sm sm:px-10">
          <CardHeader className="p-0">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Entrar
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Bem-vindo de volta! Acesse sua conta.
            </p>
          </CardHeader>

          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-lg border-border px-4 text-base transition-colors placeholder:text-muted-foreground focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-lg border-border px-4 text-base transition-colors placeholder:text-muted-foreground focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/20"
                />
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-lg bg-amber-500 text-base font-medium text-white hover:bg-amber-600"
                disabled={login.isPending}
              >
                {login.isPending ? "Entrando..." : "Entrar"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Não tem conta?{" "}
                <Link
                  to="/register"
                  className="font-medium text-amber-400 underline-offset-4 hover:underline"
                >
                  Cadastre-se
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}