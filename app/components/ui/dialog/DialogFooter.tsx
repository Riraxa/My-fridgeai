// app/components/ui/dialog/DialogFooter.tsx
import { HTMLAttributes } from "react";

type DialogFooterProps = HTMLAttributes<HTMLDivElement>;

export function DialogFooter({ className = "", ...props }: DialogFooterProps) {
  return (
    <div className={`mt-4 flex justify-end gap-2 ${className}`} {...props} />
  );
}
