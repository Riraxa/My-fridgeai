"use client";

import * as React from "react";
import styles from "./dialog.module.css";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Dialog Component - CSS Modules方式
 */
const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ open, onOpenChange, children }, ref) => {
    React.useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onOpenChange(false);
      };

      if (open) {
        document.addEventListener("keydown", handleKey);
      }

      return () => {
        document.removeEventListener("keydown", handleKey);
      };
    }, [open, onOpenChange]);

    if (!open) return null;

    return (
      <div
        ref={ref}
        className={styles.overlay}
        onClick={() => onOpenChange(false)}
      >
        <div onClick={(e) => e.stopPropagation()}>{children}</div>
      </div>
    );
  }
);

Dialog.displayName = "Dialog";

/* DialogContent */
interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.content} ${className || ""}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DialogContent.displayName = "DialogContent";

/* DialogHeader */
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.header} ${className || ""}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DialogHeader.displayName = "DialogHeader";

/* DialogFooter */
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.footer} ${className || ""}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DialogFooter.displayName = "DialogFooter";

/* DialogTitle */
interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={`${styles.title} ${className || ""}`}
        {...props}
      >
        {children}
      </h2>
    );
  }
);

DialogTitle.displayName = "DialogTitle";

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
};

export type {
  DialogProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogFooterProps,
  DialogTitleProps,
};
