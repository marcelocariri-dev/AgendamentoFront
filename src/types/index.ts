// === Modelos da API ===

export type UserRole = "admin" | "funcionario";

export type User = {
  id: number;
  name: string;
  email: string;
  tipo: UserRole;
};

export type Local = {
  id: number;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
};

export type StatusAgendamento = "confirmado" | "pendente" | "cancelado";

export type Agendamento = {
  id: number;
  user_id: number;
  user?: User | null;
  local_id: number;
  titulo: string;
  data: string;          // "YYYY-MM-DD"
  hora_inicio: string;   // "HH:mm" ou "HH:mm:ss"
  hora_final: string;    // "HH:mm" ou "HH:mm:ss"
  observacoes?: string | null;
  status: StatusAgendamento;
  ativo: boolean;
  local?: Local;

};

// === Auth ===

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  access_token?: string; // login retorna access_token
  token?: string;        // register retorna token
  token_type: string;
  user: User;
  roles?: string[];
  permissions?: string[];
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation?: string;
};

// === Resposta paginada padrão Laravel Resource ===

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links?: unknown;
};
