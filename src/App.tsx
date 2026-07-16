import { Navigate, Route, Routes } from "react-router-dom";
import Login from './pages/Login'
import Register from "./pages/Register";
import Agendamentos from "./pages/Agendamentos";
import NovoAgendamento from "./pages/NovoAgendamento";
import Locais from "./pages/Locais";
import Layout from "./components/Layout";
import { isAuthenticated } from "./hooks/useAuth";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/agendamentos" replace />} />
        <Route path="agendamentos" element={<Agendamentos />} />
        <Route path="agendamentos/novo" element={<NovoAgendamento />} />
        <Route path="locais" element={<Locais />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
