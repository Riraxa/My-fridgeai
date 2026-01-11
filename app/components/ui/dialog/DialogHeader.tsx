// app/components/ui/dialog/DialogHeader.tsx
import { HTMLAttributes } from "react";

type DialogHeaderProps = HTMLAttributes<HTMLDivElement>;

export function DialogHeader({ className = "", ...props }: DialogHeaderProps) {
  return <div className={`mb-4 ${className}`} {...props} />;
}
