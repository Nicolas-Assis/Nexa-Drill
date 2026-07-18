import Link from "next/link";
import { Shield, FileText, BarChart3, Globe, Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const FEATURES = [
  { icon: FileText, label: "Orçamentos em PDF", delay: "delay-100" },
  { icon: BarChart3, label: "Controle financeiro", delay: "delay-200" },
  { icon: Globe, label: "Perfil público", delay: "delay-300" },
  { icon: Shield, label: "Dados seguros", delay: "delay-400" },
];

const TRUST = ["Gratuito para começar", "Sem cartão de crédito", "Dados protegidos"];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side – Branding panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 lg:flex lg:w-1/2">
        {/* Decorative glows */}
        <div
          aria-hidden="true"
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl"
        />
        {/* Grid técnico */}
        <div className="tech-grid absolute inset-0 opacity-[0.4]" />

        <div className="relative z-10 flex w-full flex-col justify-between p-12">
          {/* Logo */}
          <Link href="/" className="w-fit">
            <Logo variant="full" surface="dark" height={30} priority />
          </Link>

          {/* Main content */}
          <div className="animate-fade-in space-y-8">
            <div>
              <h2 className="font-display text-4xl font-bold leading-tight text-white">
                Gerencie seu negócio de{" "}
                <span className="text-sky-300">perfuração</span> como um
                profissional
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-primary-100">
                Orçamentos, financeiro, clientes e perfil público. Tudo em uma
                plataforma feita para você.
              </p>
            </div>

            {/* Feature pills */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <div
                  key={f.label}
                  className={`flex animate-fade-in-up items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm ${f.delay}`}
                >
                  <f.icon className="h-5 w-5 shrink-0 text-sky-300" />
                  <span className="text-sm font-medium text-white">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust signals honestos (substituem métricas inventadas) */}
          <div className="flex animate-fade-in flex-wrap gap-x-6 gap-y-2 delay-500">
            {TRUST.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-2 text-sm text-primary-100"
              >
                <Check className="h-4 w-4 text-sky-300" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right side – Form */}
      <div className="relative flex w-full flex-col items-center justify-center bg-background auth-bg-pattern px-6 py-12 lg:w-1/2">
        {/* Mobile-only logo */}
        <Link href="/" className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <Logo variant="mark" height={52} className="shadow-lg" />
          <Logo variant="full" surface="light" height={24} />
        </Link>

        <div className="w-full max-w-md animate-scale-in">{children}</div>

        {/* Bottom decoration */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-900 via-primary to-sky-400"
        />
      </div>
    </div>
  );
}
