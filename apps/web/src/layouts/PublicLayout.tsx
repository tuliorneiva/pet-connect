import { Link, Outlet } from "react-router-dom";
import styles from "./PublicLayout.module.css";

export function PublicLayout() {
  return (
    <>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>PetConnect</Link>
        <Link to="/login">Área da ONG</Link>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
