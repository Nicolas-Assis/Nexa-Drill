"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, children, align = "right" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Fecha em clique externo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fecha ao trocar de rota
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Navegação por teclado dentro do menu
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      const items = menuRef.current
        ? Array.from(
            menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'),
          )
        : [];
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {trigger}
      </div>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            "absolute z-50 mt-2 min-w-[180px] rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-lg animate-scale-in",
            align === "right" ? "right-0" : "left-0",
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DropdownMenuItem({ children, onClick, className }: DropdownMenuItemProps) {
  return (
    <button
      role="menuitem"
      className={cn(
        "flex w-full items-center px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted focus:bg-muted focus:outline-none",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
