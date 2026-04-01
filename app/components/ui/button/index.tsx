"use client";

import * as React from "react";
import styles from "./button.module.css";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
}

/**
 * Button Component - CSS Modules方式
 * スタイルとコンポーネントが同じディレクトリで管理
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = "default", 
    size = "md", 
    fullWidth = false,
    children, 
    className,
    disabled,
    ...props 
  }, ref) => {
    const variantClass = styles[variant] || styles.default;
    const sizeClass = styles[size] || styles.md;
    const fullWidthClass = fullWidth ? styles.fullWidth : "";
    const disabledClass = disabled ? styles.disabled : "";
    
    return (
      <button
        ref={ref}
        className={`${styles.button} ${variantClass} ${sizeClass} ${fullWidthClass} ${disabledClass} ${className || ""}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
