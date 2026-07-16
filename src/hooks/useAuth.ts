import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "@/types";

const STORAGE = {
  token: "token",
  permissions: "permissions",
  user: "user",
  roles: "roles",
  
};

function persistAuth(data: AuthResponse) {
  // Login retorna access_token, register retorna token. Normalizamos.
  const token = data.access_token ?? data.token;
  if (!token) throw new Error("Resposta sem token");

  localStorage.setItem(STORAGE.token, token);
  localStorage.setItem(STORAGE.user, JSON.stringify(data.user));
  localStorage.setItem(STORAGE.roles, JSON.stringify(data.roles ?? []));
  localStorage.setItem(STORAGE.permissions, JSON.stringify(data.permissions ?? []));
}

export function useLogin() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<AuthResponse>("/login", payload);
      persistAuth(data);
      return data;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await api.post<AuthResponse>("/register", payload);
      persistAuth(data);
      return data;
    },
  });
}

export async function logout() {
  try {
    await api.post("/logout");
  } catch {
    // Mesmo se o backend falhar, limpamos local
  } finally {
    Object.values(STORAGE).forEach((k) => localStorage.removeItem(k));
    window.location.href = "/login";
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(STORAGE.token);
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(STORAGE.user);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function getRoles(): string[] {
  const raw = localStorage.getItem(STORAGE.roles);
  return raw ? JSON.parse(raw) : [];
}

export function getPermissions(): string[] {
  const raw = localStorage.getItem(STORAGE.permissions);
  return raw ? JSON.parse(raw) : [];
}

export function isAdmin(): boolean {
  return getRoles().includes("admin");
}

export function hasPermission(permission: string): boolean {
  if (isAdmin()) return true; // admin tem tudo (lógica do `before` da Policy)
  return getPermissions().includes(permission);
}
