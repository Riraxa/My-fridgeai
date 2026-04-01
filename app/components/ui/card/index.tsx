"use client";

import * as React from "react";
import styles from "./card.module.css";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Card Component - CSS Modules方式
 * スタイルとコンポーネントが同じディレクトリで管理
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.card} ${className || ""}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

/* CardHeader */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={`${styles.header} ${className || ""}`} {...props}>
        {children}
      </div>
    );
  }
);
CardHeader.displayName = "CardHeader";

/* CardTitle */
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h3 ref={ref} className={`${styles.title} ${className || ""}`} {...props}>
        {children}
      </h3>
    );
  }
);
CardTitle.displayName = "CardTitle";

/* CardDescription */
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <p ref={ref} className={`${styles.description} ${className || ""}`} {...props}>
        {children}
      </p>
    );
  }
);
CardDescription.displayName = "CardDescription";

/* CardContent */
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={`${styles.content} ${className || ""}`} {...props}>
        {children}
      </div>
    );
  }
);
CardContent.displayName = "CardContent";

/* CardFooter */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={`${styles.footer} ${className || ""}`} {...props}>
        {children}
      </div>
    );
  }
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};

export type {
  CardProps,
  CardHeaderProps,
  CardFooterProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
};
