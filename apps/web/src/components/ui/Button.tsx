import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", className, ...rest }: Props) {
  const cls = [styles.btn, styles[variant], className].filter(Boolean).join(" ");
  return <button className={cls} {...rest} />;
}
