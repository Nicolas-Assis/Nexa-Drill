import Link from "next/link";
import { Droplets, Shield, FileText, BarChart3, Globe } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side – Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
        {/* Decorative elements */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-600/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-success/5 blur-3xl"
        />

        {/* Pattern overlay */}
        <div className="absolute inset-0 water-pattern opacity-[0.15]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all">
              <Droplets className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">NexaDrill</span>
          </Link>

          {/* Main content area */}
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="text-4xl font-bold text-white leading-tight">
                Gerencie seu negócio de{" "}
                <span className="text-accent-300">perfuração</span> como um
                profissional
              </h2>
              <p className="mt-4 text-lg text-primary-100 leading-relaxed max-w-md">
                Orçamentos, financeiro, clientes e perfil público. Tudo em uma
                plataforma feita para você.
              </p>
            </div>

            {/* Feature pills */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: FileText,
                  label: "Orçamentos em PDF",
                  delay: "delay-100",
                },
                {
                  icon: BarChart3,
                  label: "Controle financeiro",
                  delay: "delay-200",
                },
                { icon: Globe, label: "Perfil público", delay: "delay-300" },
                { icon: Shield, label: "Dados seguros", delay: "delay-400" },
              ].map((f) => (
                <div
                  key={f.label}
                  className={`flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3 animate-fade-in-up ${f.delay}`}
                >
                  <f.icon className="h-5 w-5 text-accent-300 shrink-0" />
                  <span className="text-sm font-medium text-white">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 animate-fade-in delay-500">
            <div>
              <p className="text-3xl font-bold text-white">50+</p>
              <p className="text-sm text-primary-200">Perfuradores ativos</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">1.000+</p>
              <p className="text-sm text-primary-200">Orçamentos criados</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">100%</p>
              <p className="text-sm text-primary-200">Gratuito</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side – Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white auth-bg-pattern px-6 py-12 relative">
        {/* Mobile-only logo */}
        <Link
          href="/"
          className="mb-8 flex flex-col items-center gap-3 lg:hidden"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-700 shadow-lg shadow-primary/25 animate-pulse-glow">
            <Droplets className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">NexaDrill</h1>
        </Link>

        <div className="w-full max-w-md animate-scale-in">{children}</div>

        {/* Bottom decoration */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-success"
        />
      </div>
    </div>
  );
}
