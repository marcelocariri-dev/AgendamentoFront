import { NavLink } from "react-router-dom";
import { Calendar, MapPin, ChevronLeft } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/hooks/useAuth";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  show: boolean;
};

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user = getCurrentUser();
  const podeVerLocais = hasPermission("locais.listar");

  const navItems: NavItem[] = [
    { to: "/agendamentos", label: "Agendamentos", icon: Calendar, show: true },
    { to: "/locais", label: "Locais", icon: MapPin, show: podeVerLocais },
  ];

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Botão pêndulo — fica na borda direita da sidebar */}
      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        title={sidebarOpen ? "Recolher menu" : "Expandir menu"}
        className="absolute -right-3 top-9 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-slate-400 shadow-md transition-colors hover:text-white"
      >
        <ChevronLeft
          className={cn(
            "h-4 w-4 transition-transform duration-300",
            sidebarOpen ? "" : "rotate-180"
          )}
        />
      </button>

      {/* App Header */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-[14px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 shrink-0">
          <Calendar className="h-4 w-4 text-white" />
        </div>
        <div
          className={cn(
            "flex flex-col min-w-0 transition-all duration-300",
            sidebarOpen ? "opacity-100" : "w-0 opacity-0 overflow-hidden"
          )}
        >
          <span className="text-sm font-semibold leading-tight truncate text-white">
            Agenda de Salas
          </span>
          <span className="text-xs text-slate-400 leading-tight">
            Gestão de Espaços
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p
          className={cn(
            "mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-slate-500 transition-all duration-300",
            sidebarOpen ? "opacity-100" : "opacity-0"
          )}
        >
          Plataforma
        </p>
        <ul className="space-y-0.5">
          {navItems
            .filter((item) => item.show)
            .map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={!sidebarOpen ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      !sidebarOpen && "justify-center",
                      isActive
                        ? "bg-sidebar-accent text-white"
                        : "text-slate-400 hover:bg-sidebar-accent/60 hover:text-slate-100"
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && item.label}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>

      {/* User Footer */}
      {user && (
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-sm font-semibold uppercase">
              {user.name.charAt(0)}
            </div>
            <div
              className={cn(
                "flex flex-col min-w-0 transition-all duration-300",
                sidebarOpen ? "opacity-100" : "w-0 opacity-0 overflow-hidden"
              )}
            >
              <span className="truncate text-sm font-medium leading-tight text-slate-100">
                {user.name}
              </span>
              <span className="truncate text-xs text-slate-400 leading-tight">
                {user.email}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}