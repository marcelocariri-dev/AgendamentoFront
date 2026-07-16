import { Outlet } from "react-router-dom";
import { LogOut, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header: só ícone e logout */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
          <Calendar className="h-5 w-5 text-amber-500" />
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="gap-2 text-slate-400 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
