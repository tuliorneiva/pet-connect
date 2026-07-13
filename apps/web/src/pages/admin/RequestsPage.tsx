import { Link } from "react-router-dom";
import { adminApi } from "../../lib/adminApi";
import { useAsync } from "../../lib/useAsync";
import { SUPPORT_STATUS_OPTIONS, SUPPORT_TYPE_LABELS } from "../../lib/labels";
import type { SupportStatus } from "../../lib/types";
import { Alert } from "../../components/ui/Alert";
import styles from "./admin.module.css";

export function RequestsPage() {
  const { data, loading, error, reload } = useAsync(() => adminApi.listRequests(), []);

  async function changeStatus(id: number, status: SupportStatus) {
    await adminApi.updateRequest(id, status);
    reload();
  }

  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>Solicitações</h1>
      </div>
      {loading && <p className={styles.muted}>Carregando…</p>}
      {error && <Alert variant="error">{error}</Alert>}
      {data && data.length === 0 && (
        <div className={styles.empty}>Nenhuma solicitação recebida ainda.</div>
      )}
      {data && data.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr><th>Data</th><th>Tipo</th><th>Solicitante</th><th>Contato</th><th>Animal</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                <td>{SUPPORT_TYPE_LABELS[r.type]}</td>
                <td>
                  {r.requester_name}
                  {r.message && <div className={styles.muted}>{r.message}</div>}
                </td>
                <td>
                  <div>{r.requester_email}</div>
                  {r.requester_phone && <div className={styles.muted}>{r.requester_phone}</div>}
                </td>
                <td><Link to={`/admin/animais/${r.animal_id}`}>#{r.animal_id}</Link></td>
                <td>
                  <select
                    className={styles.select}
                    value={r.status}
                    onChange={(e) => changeStatus(r.id, e.target.value as SupportStatus)}
                  >
                    {SUPPORT_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
