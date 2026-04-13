import Link from "next/link";
import {
  Droplets,
  FileText,
  BarChart3,
  Globe,
  LayoutDashboard,
  CheckCircle,
  ArrowRight,
  Users,
} from "lucide-react";

// ─── Shared ───────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/30">
        <Droplets className="h-5 w-5 text-white" />
      </div>
      <span className="text-xl font-bold text-secondary-900">NexaDrill</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-secondary-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-secondary-600">
            <a href="#funcionalidades" className="hover:text-secondary-900 transition-colors">
              Funcionalidades
            </a>
            <a href="#como-funciona" className="hover:text-secondary-900 transition-colors">
              Como funciona
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm shadow-primary/25"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-white pt-20 pb-24">
          {/* Decorative circles */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary-100 opacity-30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-accent-100 opacity-20 blur-3xl"
          />

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              100% gratuito para começar
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-secondary-900 leading-tight">
              Gerencie seus serviços de{" "}
              <span className="text-primary">perfuração</span>
              <br />
              como um profissional
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-secondary-500 max-w-2xl mx-auto leading-relaxed">
              Orçamentos em PDF, controle financeiro e perfil público para atrair
              clientes. Tudo em um só lugar. <strong className="text-secondary-700">Grátis.</strong>
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/cadastro"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white hover:bg-primary-700 transition-colors shadow-md shadow-primary/25"
              >
                Criar minha conta grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-secondary-300 px-8 py-3.5 text-base font-semibold text-secondary-700 hover:bg-secondary-50 transition-colors"
              >
                Já tenho conta
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-secondary-400">
              {[
                "Sem cartão de crédito",
                "Sem limite de orçamentos",
                "Perfil público gratuito",
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-success" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── FUNCIONALIDADES ────────────────────────────────────────────── */}
        <section
          id="funcionalidades"
          className="py-24 bg-white scroll-mt-16"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                Funcionalidades
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-secondary-900">
                Tudo que você precisa em um só lugar
              </h2>
              <p className="mt-4 text-secondary-500 max-w-xl mx-auto">
                Do orçamento ao financeiro, gerencie todo o ciclo do seu negócio
                sem complicação.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: FileText,
                  title: "Orçamentos em PDF",
                  desc: "Crie propostas profissionais, envie por link e receba aprovação online. Kanban para acompanhar status.",
                  color: "bg-primary-50 text-primary",
                },
                {
                  icon: LayoutDashboard,
                  title: "Kanban de Serviços",
                  desc: "Acompanhe cada serviço do início ao fim. Registre profundidade, vazão e dados técnicos.",
                  color: "bg-accent-50 text-accent",
                },
                {
                  icon: BarChart3,
                  title: "Controle Financeiro",
                  desc: "Registre receitas e despesas, veja gráficos mensais e calcule seu lucro líquido.",
                  color: "bg-success-50 text-success",
                },
                {
                  icon: Globe,
                  title: "Perfil Público",
                  desc: "Mostre seu portfólio e especialidades. Clientes encontram você e solicitam orçamentos.",
                  color: "bg-secondary-100 text-secondary-600",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-secondary-100 bg-white p-6 hover:shadow-lg hover:border-secondary-200 transition-all"
                >
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.color} mb-4`}
                  >
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-secondary-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-secondary-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMO FUNCIONA ───────────────────────────────────────────────── */}
        <section
          id="como-funciona"
          className="py-24 bg-secondary-50 scroll-mt-16"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                Como funciona
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-secondary-900">
                Comece em 3 passos simples
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector line (desktop only) */}
              <div
                aria-hidden="true"
                className="hidden md:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-primary-100"
              />

              {[
                {
                  step: "01",
                  icon: Users,
                  title: "Cadastre-se gratuitamente",
                  desc: "Crie sua conta em menos de 2 minutos usando apenas seu e-mail.",
                },
                {
                  step: "02",
                  icon: FileText,
                  title: "Cadastre seus clientes",
                  desc: "Adicione seus clientes e comece a criar orçamentos profissionais com logo e PDF.",
                },
                {
                  step: "03",
                  icon: Globe,
                  title: "Divulgue seu perfil",
                  desc: "Compartilhe seu link público e receba solicitações de orçamento direto na plataforma.",
                },
              ].map((item) => (
                <div key={item.step} className="relative text-center">
                  <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 mb-5">
                    <item.icon className="h-8 w-8" />
                    <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-secondary-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-secondary-500 leading-relaxed max-w-xs mx-auto">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
        <section className="py-24 bg-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-700 px-8 py-16 shadow-2xl shadow-primary/20">
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                Comece agora —{" "}
                <span className="text-primary-100">é grátis</span>
              </h2>
              <p className="mt-4 text-primary-100 text-lg max-w-md mx-auto">
                Mais de 50 perfuradores já usam o NexaDrill para organizar seus
                negócios.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/cadastro"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary hover:bg-primary-50 transition-colors shadow-lg"
                >
                  Criar minha conta
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-100">
                {[
                  "Gratuito para sempre",
                  "Sem limite de orçamentos",
                  "Suporte em português",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-primary-200" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-secondary-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo />

            <nav className="flex flex-wrap items-center gap-6 text-sm text-secondary-500">
              <Link href="/login" className="hover:text-secondary-900 transition-colors">
                Entrar
              </Link>
              <Link href="/cadastro" className="hover:text-secondary-900 transition-colors">
                Criar conta
              </Link>
            </nav>

            <div className="flex flex-col items-center md:items-end gap-1 text-sm text-secondary-400">
              <span>
                &copy; {new Date().getFullYear()} NexaDrill. Todos os direitos reservados.
              </span>
              <span>Feito com ☕ no Brasil</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
