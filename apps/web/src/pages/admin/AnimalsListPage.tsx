import { Link, useNavigate } from "react-router-dom";
import { adminApi } from "../../lib/adminApi";
import { useAsync } from "../../lib/useAsync";
import { animalStatusLabel, animalStatusTone } from "../../lib/labels";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import styles from "./admin.module.css";

export function AnimalsListPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => adminApi.listAnimals(), []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover ${name}? Esta ação não pode ser desfeita.`)) return;
    await adminApi.deleteAnimal(id);
    reload();
  }

  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>Animais</h1>
        <Button onClick={() => navigate("/admin/animais/novo")}>Novo animal</Button>
      </div>

      {loading && <p className={styles.muted}>Carregando…</p>}
      {error && <Alert variant="error">{error}</Alert>}
      {data && data.length === 0 && (
        <div className={styles.empty}>Nenhum animal cadastrado ainda. Clique em “Novo animal”.</div>
      )}
      {data && data.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr><th>Nome</th><th>Espécie</th><th>Porte</th><th>Situação</th><th></th></tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id}>
                <td><Link to={`/admin/animais/${a.id}`}>{a.name}</Link></td>
                <td>{a.species}</td>
                <td>{a.size ?? "—"}</td>
                <td><Badge tone={animalStatusTone(a.status)}>{animalStatusLabel(a.status)}</Badge></td>
                <td>
                  <div className={styles.rowActions}>
                    <Button variant="secondary" onClick={() => navigate(`/admin/animais/${a.id}/editar`)}>Editar</Button>
                    <Button variant="ghost" onClick={() => handleDelete(a.id, a.name)}>Remover</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
