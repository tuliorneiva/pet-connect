import type { SelectHTMLAttributes } from "react";
import { useId } from "react";
import styles from "./Field.module.css";

type Option = { value: string; label: string };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Option[];
  placeholder?: string;
};

export function Select({ label, options, placeholder, id, ...rest }: Props) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={selectId}>{label}</label>
      <select className={styles.input} id={selectId} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
