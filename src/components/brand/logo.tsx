import Image from "next/image";
import { cn } from "@/lib/utils";

const WORDMARK = { w: 680, h: 231 };

interface LogoProps {
  /** "full" = wordmark NEXADRILL · "mark" = emblema quadrado */
  variant?: "full" | "mark";
  /** Cor da superfície onde a logo será exibida (define a variante de contraste). */
  surface?: "dark" | "light";
  /** Altura em px (full) ou lado do quadrado (mark). */
  height?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Marca NexaDrill. Usa os assets processados em /public/brand:
 * - wordmark creme (logo-wordmark-light) para superfícies escuras (sidebar/auth)
 * - wordmark navy (logo-wordmark-dark) para superfícies claras (header claro)
 * - emblema (logo-mark) como tile arredondado para ícones/chips
 */
export function Logo({
  variant = "full",
  surface = "dark",
  height,
  className,
  priority,
}: LogoProps) {
  if (variant === "mark") {
    const s = height ?? 36;
    return (
      <Image
        src="/brand/logo-mark.png"
        alt="NexaDrill"
        width={s}
        height={s}
        priority={priority}
        className={cn("rounded-lg", className)}
      />
    );
  }

  const h = height ?? 28;
  const w = Math.round((h * WORDMARK.w) / WORDMARK.h);
  const src =
    surface === "dark"
      ? "/brand/logo-wordmark-light.png"
      : "/brand/logo-wordmark-dark.png";

  return (
    <Image
      src={src}
      alt="NexaDrill"
      width={w}
      height={h}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}
