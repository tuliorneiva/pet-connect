import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import styles from "./AdminLayout.module.css";

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? styles.navActive : undefined;
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <span className={styles.brand}>PetConnect</span>
        <nav className={styles.nav}>
          <NavLink to="/admin" end className={navClass}>Painel</NavLink>
          <NavLink to="/admin/animais" className={navClass}>Animais</NavLink>
          <NavLink to="/admin/solicitacoes" className={navClass}>Solicitações</NavLink>
          <NavLink to="/admin/perfil" className={navClass}>Perfil da ONG</NavLink>
        </nav>
        <div className={styles.footer}>
          {user && <span className={styles.user}>{user.name}</span>}
          <Button variant="secondary" onClick={handleLogout}>Sair</Button>
        </div>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
