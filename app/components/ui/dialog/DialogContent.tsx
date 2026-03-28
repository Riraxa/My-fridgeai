// app/components/ui/dialog/DialogContent.tsx
import { ReactNode, HTMLAttributes } from "react";

type DialogContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function DialogContent({
  children,
  className = "",
  ...props
}: DialogContentProps) {
  return (
    <div
      className={`bg-[var(--background)] rounded-lg p-6 shadow-lg w-full max-w-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
