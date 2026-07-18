import { InputHTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Ícone exibido à esquerda dentro do campo (ex.: busca). */
  icon?: LucideIcon;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon: Icon, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <input
            id={id}
            className={cn(
              "flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
              Icon && "pl-9",
              error && "border-danger focus-visible:ring-danger",
              className,
            )}
            ref={ref}
            aria-invalid={error ? true : undefined}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
