import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-secondary-100 text-secondary-700": variant === "default",
          "bg-success-100 text-success-700": variant === "success",
          "bg-accent-100 text-accent-700": variant === "warning",
          "bg-danger-100 text-danger-700": variant === "danger",
          "bg-primary-100 text-primary-700": variant === "info",
        },
        className
      )}
      {...props}
    />
  );
}
