import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        {
          "bg-muted text-muted-foreground ring-border": variant === "default",
          "bg-success-50 text-success-700 ring-success-600/20": variant === "success",
          "bg-accent-50 text-accent-700 ring-accent-600/20": variant === "warning",
          "bg-danger-50 text-danger-700 ring-danger-600/20": variant === "danger",
          "bg-primary-50 text-primary-700 ring-primary-600/20": variant === "info",
        },
        className,
      )}
      {...props}
    />
  );
}
