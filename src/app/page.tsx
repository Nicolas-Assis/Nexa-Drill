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
  Shield,
  Zap,
  Star,
  TrendingUp,
} from "lucide-react";

// ─── Shared ───────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-700 shadow-md shadow-primary/30">
        <Droplets className="h-5 w-5 text-white" />
      </div>
      <span className="text-xl font-bold text-secondary-900">
        Nexa<span className="text-primary">Drill</span>
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-secondary-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-secondary-600">
            <a
              href="#funcionalidades"
              className="hover:text-primary transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#como-funciona"
              className="hover:text-primary transition-colors"
            >
              Como funciona
            </a>
            <a
              href="#depoimentos"
              className="hover:text-primary transition-colors"
            >
              Depoimentos
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-secondary-700 hover:text-primary transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-xl bg-gradient-to-r from-primary to-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
          {/* Background gradient mesh */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-success-50/30" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-40 h-[700px] w-[700px] rounded-full bg-primary-100 opacity-40 blur-3xl animate-float"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-accent-100 opacity-25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/3 left-1/3 h-72 w-72 rounded-full bg-success-100 opacity-20 blur-3xl"
          />

          {/* Water pattern */}
          <div className="absolute inset-0 water-pattern opacity-40" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left column – text */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-1.5 text-sm font-medium text-primary mb-6 shadow-sm animate-fade-in">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  100% gratuito — sempre
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-secondary-900 leading-[1.1] animate-fade-in-up">
                  Gerencie seus serviços de{" "}
                  <span className="gradient-text">perfuração</span> como um
                  profissional
                </h1>

                <p className="mt-6 text-lg sm:text-xl text-secondary-500 max-w-xl mx-auto lg:mx-0 leading-relaxed animate-fade-in-up delay-200">
                  Orçamentos em PDF, controle financeiro e perfil público para
                  atrair clientes. Tudo em um só lugar.{" "}
                  <strong className="text-secondary-800 font-bold">
                    Grátis.
                  </strong>
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in-up delay-300">
                  <Link
                    href="/cadastro"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-700 px-8 py-4 text-base font-semibold text-white hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                  >
                    Criar minha conta grátis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-secondary-200 bg-white px-8 py-4 text-base font-semibold text-secondary-700 hover:border-primary hover:text-primary hover:bg-primary-50/50 transition-all"
                  >
                    Já tenho conta
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-sm text-secondary-500 animate-fade-in delay-400">
                  {[
                    { icon: CheckCircle, text: "Sem cartão de crédito" },
                    { icon: Shield, text: "Dados 100% seguros" },
                    { icon: Zap, text: "Pronto em 2 minutos" },
                  ].map((item) => (
                    <span key={item.text} className="flex items-center gap-1.5">
                      <item.icon className="h-4 w-4 text-success" />
                      {item.text}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right column – visual card mockup */}
              <div className="relative hidden lg:block animate-fade-in-up delay-300">
                <div className="relative">
                  {/* Main card */}
                  <div className="rounded-2xl bg-white border border-secondary-200 shadow-2xl shadow-secondary-200/50 p-6 space-y-5">
                    {/* Mock header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center">
                          <Droplets className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-secondary-900">
                            Dashboard
                          </p>
                          <p className="text-xs text-secondary-400">
                            NexaDrill Pro
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-danger-300" />
                        <div className="h-3 w-3 rounded-full bg-accent-300" />
                        <div className="h-3 w-3 rounded-full bg-success-300" />
                      </div>
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Orçamentos",
                          value: "24",
                          color: "from-primary-50 to-primary-100 text-primary",
                          border: "border-primary-100",
                        },
                        {
                          label: "Receita",
                          value: "R$ 48k",
                          color: "from-success-50 to-success-100 text-success",
                          border: "border-success-100",
                        },
                        {
                          label: "Clientes",
                          value: "18",
                          color: "from-accent-50 to-accent-100 text-accent-700",
                          border: "border-accent-100",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className={`rounded-xl bg-gradient-to-br ${stat.color} border ${stat.border} p-3 text-center`}
                        >
                          <p className="text-lg font-bold">{stat.value}</p>
                          <p className="text-xs opacity-70">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                    {/* Chart placeholder */}
                    <div className="h-32 rounded-xl bg-gradient-to-br from-secondary-50 to-secondary-100 flex items-end justify-around px-4 pb-3 gap-2">
                      {[
                        "h-[40%]",
                        "h-[65%]",
                        "h-[45%]",
                        "h-[80%]",
                        "h-[55%]",
                        "h-[90%]",
                        "h-[70%]",
                        "h-[85%]",
                      ].map((hClass, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-t-md bg-gradient-to-t from-primary to-primary-400 opacity-80 ${hClass}`}
                        />
                      ))}
                    </div>
                    {/* Mock list */}
                    <div className="space-y-2">
                      {[
                        "Orçamento #024 — Aprovado",
                        "Serviço Poço #18 — Em andamento",
                        "Novo cliente — Bruno Lima",
                      ].map((text, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg bg-secondary-50 px-3 py-2"
                        >
                          <div
                            className={`h-2 w-2 rounded-full ${i === 0 ? "bg-success" : i === 1 ? "bg-accent" : "bg-primary"}`}
                          />
                          <span className="text-xs text-secondary-600">
                            {text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Floating badge */}
                  <div className="absolute -top-4 -right-4 rounded-xl bg-gradient-to-br from-success to-success-600 px-4 py-2 text-white shadow-lg shadow-success/30 animate-float">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-bold">+127% receita</span>
                    </div>
                  </div>

                  {/* Floating notification */}
                  <div className="absolute -bottom-3 -left-4 rounded-xl bg-white border border-secondary-200 px-4 py-2.5 shadow-lg animate-float delay-500">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-secondary-900">
                          Novo orçamento
                        </p>
                        <p className="text-[10px] text-secondary-400">
                          Enviado há 2 min
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF BAR ───────────────────────────────────────────── */}
        <section className="border-y border-secondary-100 bg-secondary-50/50 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
              {[
                { value: "50+", label: "Perfuradores ativos" },
                { value: "1.200+", label: "Orçamentos gerados" },
                { value: "R$ 2M+", label: "Em orçamentos criados" },
                { value: "4.9", label: "Avaliação média", icon: Star },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl sm:text-3xl font-extrabold text-secondary-900">
                      {stat.value}
                    </p>
                    {stat.icon && (
                      <stat.icon className="h-5 w-5 text-accent fill-accent" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-secondary-500 mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FUNCIONALIDADES ────────────────────────────────────────────── */}
        <section
          id="funcionalidades"
          className="py-24 bg-white scroll-mt-16 relative overflow-hidden"
        >
          {/* Subtle background */}
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 h-96 w-96 rounded-full bg-primary-50 opacity-50 blur-3xl"
          />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-100 px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-4">
                <Zap className="h-3.5 w-3.5" />
                Funcionalidades
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-secondary-900">
                Tudo que você precisa{" "}
                <span className="gradient-text">em um só lugar</span>
              </h2>
              <p className="mt-4 text-lg text-secondary-500 max-w-2xl mx-auto">
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
                  gradient: "from-primary to-primary-700",
                  bg: "bg-primary-50",
                  border: "hover:border-primary-200",
                },
                {
                  icon: LayoutDashboard,
                  title: "Kanban de Serviços",
                  desc: "Acompanhe cada serviço do início ao fim. Registre profundidade, vazão e dados técnicos.",
                  gradient: "from-accent to-accent-600",
                  bg: "bg-accent-50",
                  border: "hover:border-accent-200",
                },
                {
                  icon: BarChart3,
                  title: "Controle Financeiro",
                  desc: "Registre receitas e despesas, veja gráficos mensais e calcule seu lucro líquido.",
                  gradient: "from-success to-success-600",
                  bg: "bg-success-50",
                  border: "hover:border-success-200",
                },
                {
                  icon: Globe,
                  title: "Perfil Público",
                  desc: "Mostre seu portfólio e especialidades. Clientes encontram você e solicitam orçamentos.",
                  gradient: "from-secondary-600 to-secondary-800",
                  bg: "bg-secondary-100",
                  border: "hover:border-secondary-300",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className={`group rounded-2xl border border-secondary-100 bg-white p-6 hover:shadow-xl hover-lift ${f.border} transition-all`}
                >
                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} shadow-lg mb-5`}
                  >
                    <f.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-secondary-900 mb-2">
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
          className="py-24 scroll-mt-16 relative overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900" />
          <div className="absolute inset-0 water-pattern opacity-[0.06]" />

          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-bold text-primary-200 uppercase tracking-wider mb-4">
                Como funciona
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white">
                Comece em <span className="text-accent-300">3 passos</span>{" "}
                simples
              </h2>
              <p className="mt-4 text-lg text-primary-200 max-w-xl mx-auto">
                Configure tudo em menos de 5 minutos e comece a impressionar
                seus clientes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector line (desktop only) */}
              <div
                aria-hidden="true"
                className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary-400 via-accent-400 to-success-400 opacity-40"
              />

              {[
                {
                  step: "01",
                  icon: Users,
                  title: "Cadastre-se gratuitamente",
                  desc: "Crie sua conta em menos de 2 minutos usando apenas seu e-mail.",
                  color: "from-primary to-primary-600",
                  badge: "bg-primary-400",
                },
                {
                  step: "02",
                  icon: FileText,
                  title: "Cadastre clientes e crie orçamentos",
                  desc: "Adicione seus clientes e gere propostas profissionais em PDF com sua marca.",
                  color: "from-accent to-accent-600",
                  badge: "bg-accent",
                },
                {
                  step: "03",
                  icon: Globe,
                  title: "Divulgue e receba pedidos",
                  desc: "Compartilhe seu link público e receba solicitações de orçamento automaticamente.",
                  color: "from-success to-success-600",
                  badge: "bg-success",
                },
              ].map((item) => (
                <div key={item.step} className="relative text-center group">
                  <div
                    className={`relative inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${item.color} text-white shadow-2xl mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <item.icon className="h-10 w-10" />
                    <span
                      className={`absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full ${item.badge} text-sm font-black text-white shadow-lg`}
                    >
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-primary-200 leading-relaxed max-w-xs mx-auto">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DEPOIMENTOS ────────────────────────────────────────────────── */}
        <section id="depoimentos" className="py-24 bg-white scroll-mt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent-50 border border-accent-100 px-4 py-1.5 text-xs font-bold text-accent-700 uppercase tracking-wider mb-4">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                Depoimentos
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-secondary-900">
                O que dizem nossos{" "}
                <span className="gradient-text-warm">perfuradores</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "Carlos Souza",
                  role: "Souza Perfurações - GO",
                  text: "Antes eu fazia orçamentos no Word e perdia horas. Agora em 5 minutos tenho um PDF profissional pronto para enviar.",
                  stars: 5,
                },
                {
                  name: "Maria Santos",
                  role: "MS Poços Artesianos - MG",
                  text: "O perfil público e o controle financeiro mudaram meu negócio. Consigo ver meu lucro real e atrair clientes novos.",
                  stars: 5,
                },
                {
                  name: "João Lima",
                  role: "Lima & Filhos - SP",
                  text: "Sistema simples e direto. O Kanban de serviços me ajuda a não esquecer nenhuma etapa. Recomendo para todos perfuradores!",
                  stars: 5,
                },
              ].map((dep) => (
                <div
                  key={dep.name}
                  className="rounded-2xl border border-secondary-100 bg-gradient-to-br from-white to-secondary-50/50 p-6 hover:shadow-xl hover-lift transition-all"
                >
                  <div className="flex items-center gap-0.5 mb-4">
                    {Array.from({ length: dep.stars }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-accent text-accent"
                      />
                    ))}
                  </div>
                  <p className="text-secondary-600 text-sm leading-relaxed mb-6 italic">
                    &ldquo;{dep.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-700 text-white font-bold text-sm">
                      {dep.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-secondary-900">
                        {dep.name}
                      </p>
                      <p className="text-xs text-secondary-500">{dep.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
        <section className="py-24 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-700 to-primary-900" />
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-full"
          >
            <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-success/10 blur-3xl" />
          </div>
          <div className="absolute inset-0 water-pattern opacity-[0.06]" />

          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-6">
              <Zap className="h-4 w-4 text-accent-300" />
              Comece hoje mesmo
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              Pare de perder tempo. <br className="hidden sm:block" />
              <span className="text-accent-300">Comece agora.</span>
            </h2>

            <p className="mt-6 text-xl text-primary-100 max-w-xl mx-auto leading-relaxed">
              Junte-se a mais de 50 perfuradores que já usam o NexaDrill para
              organizar e crescer seus negócios.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/cadastro"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-primary hover:bg-primary-50 hover:-translate-y-0.5 transition-all shadow-xl hover:shadow-2xl"
              >
                Criar minha conta grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-100">
              {[
                "Gratuito para sempre",
                "Sem limite de orçamentos",
                "Suporte em português",
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-accent-300" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-secondary-200 bg-secondary-900 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-700">
                <Droplets className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Nexa<span className="text-primary-300">Drill</span>
              </span>
            </div>

            <nav className="flex flex-wrap items-center gap-6 text-sm text-secondary-400">
              <Link
                href="/login"
                className="hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="hover:text-white transition-colors"
              >
                Criar conta
              </Link>
            </nav>

            <div className="flex flex-col items-center md:items-end gap-1 text-sm text-secondary-500">
              <span>
                &copy; {new Date().getFullYear()} NexaDrill. Todos os direitos
                reservados.
              </span>
              <span>Feito com ☕ no Brasil</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
