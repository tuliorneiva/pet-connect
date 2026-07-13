import { useAuth } from "../../auth/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  return (
    <section>
      <h1>Painel</h1>
      <p>Bem-vindo(a), {user?.name}. O dashboard com alertas chega nas próximas etapas.</p>
    </section>
  );
}
