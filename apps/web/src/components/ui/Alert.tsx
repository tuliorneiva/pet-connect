import type { ReactNode } from "react";
import styles from "./Alert.module.css";

export function Alert({ variant = "error", children }: { variant?: "error" | "success" | "warning"; children: ReactNode }) {
  return <div role="alert" className={[styles.alert, styles[variant]].join(" ")}>{children}</div>;
}
