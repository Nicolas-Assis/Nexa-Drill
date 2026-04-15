import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  MapPin,
  Phone,
  Mail,
  Star,
  Wrench,
  Droplets,
  ArrowRight,
  MessageCircle,
  CheckCircle2,
  Clock,
  Shield,
  Award,
  Ruler,
  Target,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { getPerfuradorPublico } from "./actions";
import { SolicitarForm } from "./solicitar-form";
import { ShareButtons } from "./share-buttons";

const TIPOS_SERVICO_LABELS: Record<string, string> = {
  perfuracao: "Perfuração de Poços",
  manutencao: "Manutenção",
  limpeza: "Limpeza",
  bombeamento: "Bombeamento",
};

const TIPOS_SOLO_LABELS: Record<string, string> = {
  rocha: "Rocha",
  areia: "Areia",
  argila: "Argila",
  misto: "Misto",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nexadrill.com.br";

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { perfurador } = await getPerfuradorPublico(params.slug);

  if (!perfurador) return { title: "Perfil não encontrado — NexaDrill" };

  const name = perfurador.nome_empresa ?? perfurador.nome;
  const description =
    perfurador.bio ??
    `${name} — perfurador de poços artesianos em ${perfurador.cidade ?? "todo o Brasil"}. Solicite um orçamento gratuito.`;

  return {
    title: `${name} — Perfurador de Poços | NexaDrill`,
    description,
    openGraph: {
      title: name,
      description,
      images: perfurador.logo_url ? [{ url: perfurador.logo_url }] : [],
      type: "profile",
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Pill({
  children,
  color = "primary",
}: {
  children: React.ReactNode;
  color?: "primary" | "accent" | "success";
}) {
  const styles = {
    primary:
      "bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 border-primary-200 shadow-sm shadow-primary-100/50",
    accent:
      "bg-gradient-to-r from-accent-50 to-accent-100 text-accent-700 border-accent-200 shadow-sm shadow-accent-100/50",
    success:
      "bg-gradient-to-r from-success-50 to-success-100 text-success-700 border-success-200 shadow-sm shadow-success-100/50",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3.5 py-1 text-sm font-semibold ${styles[color]}`}
    >
      {children}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PerfilPublicoPage({
  params,
}: {
  params: { slug: string };
}) {
  const { perfurador, servicos, error } = await getPerfuradorPublico(
    params.slug,
  );

  if (error || !perfurador) notFound();

  const displayName = perfurador.nome_empresa ?? perfurador.nome;
  const whatsappNumber = perfurador.telefone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(
    "Olá! Vi seu perfil no NexaDrill e gostaria de solicitar um orçamento.",
  )}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: displayName,
    description: perfurador.bio ?? undefined,
    image: perfurador.logo_url ?? undefined,
    telephone: perfurador.telefone,
    email: perfurador.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: perfurador.cidade ?? undefined,
      addressRegion: perfurador.estado ?? undefined,
      addressCountry: "BR",
    },
    areaServed: perfurador.raio_atendimento_km
      ? {
          "@type": "GeoCircle",
          geoRadius: `${perfurador.raio_atendimento_km} km`,
        }
      : undefined,
    url: `${APP_URL}/perfil/${perfurador.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-white">
        {/* ── Navbar ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 border-b border-secondary-100 bg-white/80 backdrop-blur-lg">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-700 shadow-sm">
                <Droplets className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-bold text-secondary-900">
                Nexa<span className="text-primary">Drill</span>
              </span>
            </div>
            <a
              href="#solicitar"
              className="rounded-xl bg-gradient-to-r from-primary to-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all"
            >
              Solicitar orçamento
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-10">
          {/* ── HERO SECTION ─────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-3xl">
            {/* Background with gradient and pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700" />
            <div className="absolute inset-0 water-pattern opacity-[0.06]" />
            <div
              aria-hidden="true"
              className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-success/10 blur-3xl"
            />

            <div className="relative p-6 sm:p-10">
              <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4 shrink-0">
                  <div className="relative">
                    {perfurador.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={perfurador.logo_url}
                        alt={displayName}
                        className="h-36 w-36 rounded-2xl object-cover shadow-2xl ring-4 ring-white/20"
                      />
                    ) : (
                      <div className="flex h-36 w-36 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-2xl ring-4 ring-white/20">
                        <Droplets className="h-16 w-16 text-white/80" />
                      </div>
                    )}
                    {/* Verified badge */}
                    <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-success shadow-lg ring-2 ring-white">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  {/* Quick stats under avatar */}
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-white">
                        {perfurador.total_servicos}
                      </p>
                      <p className="text-xs text-primary-200 font-medium">
                        serviços
                      </p>
                    </div>
                    {perfurador.avaliacao_media > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-white">
                          {perfurador.avaliacao_media.toFixed(1)}
                        </p>
                        <p className="text-xs text-primary-200 font-medium">
                          avaliação
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-2">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
                      {displayName}
                    </h1>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 backdrop-blur-sm border border-success/30 px-3 py-1 text-xs font-semibold text-success-200">
                      <Shield className="h-3 w-3" />
                      Verificado
                    </span>
                  </div>

                  {(perfurador.cidade || perfurador.estado) && (
                    <div className="flex items-center justify-center lg:justify-start gap-1.5 text-primary-200">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">
                        {[perfurador.cidade, perfurador.estado]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {perfurador.avaliacao_media > 0 && (
                    <div className="flex items-center justify-center lg:justify-start gap-1 mt-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={
                              i < Math.floor(perfurador.avaliacao_media)
                                ? "h-5 w-5 fill-accent text-accent"
                                : "h-5 w-5 text-white/30"
                            }
                          />
                        ))}
                        <span className="ml-1.5 text-sm font-bold text-white">
                          {perfurador.avaliacao_media.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}

                  {perfurador.bio && (
                    <p className="mt-4 text-primary-100 leading-relaxed max-w-xl mx-auto lg:mx-0 text-sm sm:text-base">
                      {perfurador.bio}
                    </p>
                  )}

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-6">
                    <a
                      href="#solicitar"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary hover:bg-primary-50 hover:-translate-y-0.5 transition-all shadow-lg"
                    >
                      Solicitar orçamento
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    {perfurador.telefone && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-success/90 backdrop-blur-sm border border-success/30 px-6 py-3 text-sm font-bold text-white hover:bg-success hover:shadow-lg hover:shadow-success/25 hover:-translate-y-0.5 transition-all"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    )}
                    <ShareButtons
                      url={`${APP_URL}/perfil/${perfurador.slug}`}
                      title={`${displayName} — Perfurador de Poços`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── STATS CARDS ──────────────────────────────────────────── */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {perfurador.raio_atendimento_km && (
              <div className="rounded-2xl border border-secondary-100 bg-white p-5 text-center hover:shadow-xl hover-lift transition-all group">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 mb-3 group-hover:scale-110 transition-transform">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <p className="text-2xl font-extrabold text-secondary-900">
                  {perfurador.raio_atendimento_km} km
                </p>
                <p className="text-xs text-secondary-500 mt-1 font-medium">
                  raio de atendimento
                </p>
              </div>
            )}

            {perfurador.profundidade_max_metros && (
              <div className="rounded-2xl border border-secondary-100 bg-white p-5 text-center hover:shadow-xl hover-lift transition-all group">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100 mb-3 group-hover:scale-110 transition-transform">
                  <Ruler className="h-7 w-7 text-accent-600" />
                </div>
                <p className="text-2xl font-extrabold text-secondary-900">
                  {perfurador.profundidade_max_metros} m
                </p>
                <p className="text-xs text-secondary-500 mt-1 font-medium">
                  profundidade máx.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-secondary-100 bg-white p-5 text-center hover:shadow-xl hover-lift transition-all group">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-success-50 to-success-100 mb-3 group-hover:scale-110 transition-transform">
                <Award className="h-7 w-7 text-success" />
              </div>
              <p className="text-2xl font-extrabold text-secondary-900">
                {perfurador.total_servicos}
              </p>
              <p className="text-xs text-secondary-500 mt-1 font-medium">
                serviços realizados
              </p>
            </div>

            <div className="rounded-2xl border border-secondary-100 bg-white p-5 text-center hover:shadow-xl hover-lift transition-all group">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-warning-50 to-warning-100 mb-3 group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7 text-warning" />
              </div>
              <p className="text-2xl font-extrabold text-secondary-900">24h</p>
              <p className="text-xs text-secondary-500 mt-1 font-medium">
                tempo de resposta
              </p>
            </div>
          </section>

          {/* ── CONTACT INFO BAR ─────────────────────────────────────── */}
          <section className="rounded-2xl bg-gradient-to-r from-secondary-50 to-secondary-100/50 border border-secondary-100 p-4 sm:p-6">
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm">
              {perfurador.telefone && (
                <a
                  href={`tel:${perfurador.telefone}`}
                  className="flex items-center gap-2.5 text-secondary-600 hover:text-primary transition-colors group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 group-hover:bg-primary-100 transition-colors">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{perfurador.telefone}</span>
                </a>
              )}
              {perfurador.email && (
                <a
                  href={`mailto:${perfurador.email}`}
                  className="flex items-center gap-2.5 text-secondary-600 hover:text-primary transition-colors group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 group-hover:bg-primary-100 transition-colors">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{perfurador.email}</span>
                </a>
              )}
              {(perfurador.cidade || perfurador.estado) && (
                <span className="flex items-center gap-2.5 text-secondary-600">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">
                    {[perfurador.cidade, perfurador.estado]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </span>
              )}
            </div>
          </section>

          {/* ── ESPECIALIDADES ───────────────────────────────────────── */}
          {(perfurador.tipos_servico.length > 0 ||
            perfurador.tipos_solo_experiencia.length > 0) && (
            <section>
              <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-100 px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  Especialidades
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-secondary-900">
                  Serviços e experiências
                </h2>
                <p className="text-secondary-500 mt-1">
                  Áreas de atuação do profissional
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {perfurador.tipos_servico.length > 0 && (
                  <div className="rounded-2xl border border-secondary-100 bg-white p-6 hover:shadow-xl hover-lift transition-all">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-700 shadow-lg shadow-primary/20">
                        <Wrench className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-secondary-900">
                          Serviços Oferecidos
                        </p>
                        <p className="text-xs text-secondary-500 font-medium">
                          {perfurador.tipos_servico.length} tipos de serviço
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {perfurador.tipos_servico.map((t) => (
                        <Pill key={t} color="primary">
                          {TIPOS_SERVICO_LABELS[t] ?? t}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}

                {perfurador.tipos_solo_experiencia.length > 0 && (
                  <div className="rounded-2xl border border-secondary-100 bg-white p-6 hover:shadow-xl hover-lift transition-all">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-600 shadow-lg shadow-accent/20">
                        <Droplets className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-secondary-900">
                          Experiência em Solos
                        </p>
                        <p className="text-xs text-secondary-500 font-medium">
                          {perfurador.tipos_solo_experiencia.length} tipos de
                          solo
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {perfurador.tipos_solo_experiencia.map((t) => (
                        <Pill key={t} color="accent">
                          {TIPOS_SOLO_LABELS[t] ?? t}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── PORTFÓLIO ────────────────────────────────────────────── */}
          {servicos.length > 0 && (
            <section>
              <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-success-50 border border-success-100 px-4 py-1.5 text-xs font-bold text-success-700 uppercase tracking-wider mb-3">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Portfólio
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-secondary-900">
                  Trabalhos realizados
                </h2>
                <p className="text-secondary-500 mt-1">
                  Confira nossos serviços mais recentes
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {servicos.map((s) => (
                  <div
                    key={s.id}
                    className="group rounded-2xl border border-secondary-100 bg-white overflow-hidden hover:shadow-xl hover-lift transition-all"
                  >
                    {s.fotos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.fotos[0]}
                        alt="Foto do serviço"
                        className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50">
                        <Droplets className="h-14 w-14 text-secondary-200" />
                      </div>
                    )}
                    <div className="p-5 space-y-3">
                      {s.cliente_cidade && (
                        <p className="flex items-center gap-1.5 text-xs text-secondary-500 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {s.cliente_cidade}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        {s.profundidade_real_metros != null && (
                          <div>
                            <p className="text-2xl font-extrabold text-secondary-900">
                              {s.profundidade_real_metros}
                              <span className="text-sm font-medium text-secondary-400 ml-0.5">
                                m
                              </span>
                            </p>
                            <p className="text-xs text-secondary-400 font-medium">
                              profundidade
                            </p>
                          </div>
                        )}
                        {s.vazao_litros_hora != null && (
                          <div className="text-right">
                            <p className="text-2xl font-extrabold text-accent-600">
                              {s.vazao_litros_hora}
                              <span className="text-sm font-medium text-secondary-400 ml-0.5">
                                L/h
                              </span>
                            </p>
                            <p className="text-xs text-secondary-400 font-medium">
                              vazão
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── DIFERENCIAIS ─────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900" />
            <div className="absolute inset-0 water-pattern opacity-[0.06]" />

            <div className="relative p-6 sm:p-10">
              <div className="mb-8 text-center">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Por que nos escolher?
                </h2>
                <p className="text-primary-200 mt-1">
                  Diferenciais que fazem a diferença
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  {
                    icon: Shield,
                    title: "Garantia de Qualidade",
                    desc: "Serviços com garantia e acompanhamento técnico especializado",
                    gradient: "from-primary to-primary-600",
                  },
                  {
                    icon: Clock,
                    title: "Resposta Rápida",
                    desc: "Orçamento em até 24h após a solicitação do cliente",
                    gradient: "from-accent to-accent-600",
                  },
                  {
                    icon: Award,
                    title: "Experiência Comprovada",
                    desc: `${perfurador.total_servicos} serviços realizados com sucesso`,
                    gradient: "from-success to-success-600",
                  },
                ].map((item) => (
                  <div key={item.title} className="text-center group">
                    <div
                      className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} shadow-xl mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-white mb-2 text-lg">
                      {item.title}
                    </h3>
                    <p className="text-sm text-primary-200 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── SOLICITAR ORÇAMENTO ──────────────────────────────────── */}
          <section id="solicitar" className="scroll-mt-20">
            <div className="rounded-3xl border border-secondary-100 bg-white p-6 sm:p-10 shadow-xl shadow-secondary-200/30 overflow-hidden relative">
              {/* Top gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-success" />

              <div className="max-w-xl mx-auto">
                <div className="text-center mb-10">
                  <div className="inline-flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-700 mb-5 shadow-xl shadow-primary/20">
                    <MessageCircle className="h-9 w-9 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-secondary-900">
                    Solicitar Orçamento Gratuito
                  </h2>
                  <p className="text-secondary-500 mt-2 leading-relaxed">
                    Preencha o formulário e{" "}
                    <span className="font-bold text-secondary-700">
                      {displayName}
                    </span>{" "}
                    entrará em contato em até 24h.
                  </p>
                </div>
                <SolicitarForm perfuradorId={perfurador.id} />
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-secondary-100 bg-secondary-900 py-8">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-secondary-400">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-700">
                <Droplets className="h-4 w-4 text-white" />
              </div>
              <span>
                Perfil criado com{" "}
                <a
                  href={APP_URL}
                  className="text-primary-300 hover:text-primary-200 hover:underline font-semibold"
                >
                  NexaDrill
                </a>
              </span>
            </div>
            <span>&copy; {new Date().getFullYear()} NexaDrill</span>
          </div>
        </footer>
      </div>
    </>
  );
}
