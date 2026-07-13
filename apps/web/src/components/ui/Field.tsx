import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import styles from "./Field.module.css";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Field({ label, error, id, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>{label}</label>
      <input className={styles.input} id={inputId} {...rest} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
