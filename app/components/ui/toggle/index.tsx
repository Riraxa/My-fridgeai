"use client";

import * as React from "react";
import styles from "./toggle.module.css";

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

/**
 * 標準トグルスイッチコンポーネント
 * CSS Modules方式 - スタイルとコンポーネントが同じディレクトリ
 * 
 * @example
 * <Toggle checked={enabled} onChange={() => setEnabled(!enabled)} />
 */
const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, size = "md", disabled = false, className }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={disabled ? undefined : onChange}
        data-checked={checked ? "true" : "false"}
        disabled={disabled}
        className={`${styles.toggle} ${size === "sm" ? styles.sm : ""} ${className || ""}`}
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onChange();
          }
        }}
      >
        <span className={styles.toggleThumb} />
      </button>
    );
  }
);

Toggle.displayName = "Toggle";

export { Toggle };
export type { ToggleProps };
