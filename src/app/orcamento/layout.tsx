import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orçamento — NexaDrill",
  description:
    "Visualize, aprove ou solicite alterações no seu orçamento de poço artesiano.",
  robots: { index: false, follow: false },
};

export default function OrcamentoPublicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
