import { Link } from "react-router-dom";
import { PartyPopper } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { adminApi } from "../../lib/adminApi";
import { useAsync } from "../../lib/useAsync";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import styles from "./admin.module.css";

export function DashboardPage() {
  const { user } = useAuth();
  const summary = useAsync(() => adminApi.summary(), []);
  const alerts = useAsync(() => adminApi.alerts(), []);

  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>Painel</h1>
        <span className={styles.muted}>Olá, {user?.name}</span>
      </div>

      {summary.data && (
        <div className={styles.cards}>
          <Card className={styles.stat}>
            <div className={styles.statValue}>{summary.data.animals_total}</div>
            <div className={styles.statLabel}>Animais cadastrados</div>
          </Card>
          <Card className={styles.stat}>
            <div className={styles.statValue}>{summary.data.animals_available}</div>
            <div className={styles.statLabel}>Disponíveis</div>
          </Card>
          <Card className={styles.stat}>
            <div className={styles.statValue}>{summary.data.animals_adopted}</div>
            <div className={styles.statLabel}>Adotados</div>
          </Card>
          <Card className={styles.stat}>
            <div className={styles.statValue}>{summary.data.new_requests}</div>
            <div className={styles.statLabel}>Solicitações novas</div>
          </Card>
        </div>
      )}

      <h2 className={styles.title} style={{ fontSize: "var(--text-lg)" }}>Alertas de saúde</h2>
      {alerts.loading && <p className={styles.muted}>Carregando alertas…</p>}
      {alerts.error && <Alert variant="error">{alerts.error}</Alert>}
      {alerts.data && alerts.data.length === 0 && (
        <Card>
          <p className={styles.muted} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <PartyPopper size={16} aria-hidden="true" /> Nenhum alerta pendente. Tudo em dia!
          </p>
        </Card>
      )}
      {alerts.data && alerts.data.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr><th>Animal</th><th>Alerta</th><th>Vencimento</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {alerts.data.map((a, i) => (
              <tr key={i}>
                <td><Link to={`/admin/animais/${a.animal_id}`}>{a.animal_name}</Link></td>
                <td>{a.description}</td>
                <td>{a.due_at ?? "—"}</td>
                <td>
                  <Badge tone={a.level === "atrasado" ? "danger" : "warning"}>
                    {a.level === "atrasado" ? "Atrasado" : "Pendente"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
