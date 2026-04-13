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

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < full
              ? "h-4 w-4 fill-accent text-accent"
              : half && i === full
                ? "h-4 w-4 fill-accent/40 text-accent"
                : "h-4 w-4 text-secondary-300"
          }
        />
      ))}
      <span className="ml-1 text-sm font-medium text-secondary-700">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function Pill({
  children,
  color = "primary",
}: {
  children: React.ReactNode;
  color?: "primary" | "accent" | "success";
}) {
  const styles = {
    primary: "bg-primary-50 text-primary-700 border-primary-100",
    accent: "bg-accent-50 text-accent-700 border-accent-100",
    success: "bg-success-50 text-success-700 border-success-100",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-medium ${styles[color]}`}
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

      <div className="min-h-screen bg-gradient-to-b from-secondary-50 to-white">
        {/* Navbar */}
        <header className="sticky top-0 z-40 border-b border-secondary-200 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-700">
                <Droplets className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-bold text-secondary-900">
                NexaDrill
              </span>
            </div>
            <a
              href="#solicitar"
              className="rounded-xl bg-gradient-to-r from-primary to-primary-700 px-5 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              Solicitar orçamento
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-12">
          {/* ── HERO CARD ────────────────────────────────────────────── */}
          <section className="relative">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-success/5 rounded-3xl" />

            <div className="relative rounded-3xl border border-secondary-200 bg-white/80 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Avatar + Badges */}
                <div className="flex flex-col items-center lg:items-start gap-4">
                  <div className="relative">
                    {perfurador.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={perfurador.logo_url}
                        alt={displayName}
                        className="h-32 w-32 rounded-2xl object-cover shadow-lg ring-4 ring-white"
                      />
                    ) : (
                      <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-700 shadow-lg ring-4 ring-white">
                        <Droplets className="h-14 w-14 text-white" />
                      </div>
                    )}
                    {/* Verified badge */}
                    <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-success shadow-md">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  {/* Quick stats under avatar */}
                  <div className="flex gap-4 text-center lg:text-left">
                    <div>
                      <p className="text-2xl font-bold text-secondary-900">
                        {perfurador.total_servicos}
                      </p>
                      <p className="text-xs text-secondary-500">serviços</p>
                    </div>
                    {perfurador.avaliacao_media > 0 && (
                      <div>
                        <p className="text-2xl font-bold text-secondary-900">
                          {perfurador.avaliacao_media.toFixed(1)}
                        </p>
                        <p className="text-xs text-secondary-500">avaliação</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900">
                      {displayName}
                    </h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700 border border-success-200">
                      <Shield className="h-3 w-3" />
                      Verificado
                    </span>
                  </div>

                  {(perfurador.cidade || perfurador.estado) && (
                    <div className="flex items-center justify-center lg:justify-start gap-1.5 text-secondary-500">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="text-sm">
                        {[perfurador.cidade, perfurador.estado]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {perfurador.avaliacao_media > 0 && (
                    <div className="flex items-center justify-center lg:justify-start gap-1 mt-2">
                      <StarRating value={perfurador.avaliacao_media} />
                    </div>
                  )}

                  {perfurador.bio && (
                    <p className="mt-4 text-secondary-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                      {perfurador.bio}
                    </p>
                  )}

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-6">
                    <a
                      href="#solicitar"
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-700 px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary/25 transition-all"
                    >
                      Solicitar orçamento
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    {perfurador.telefone && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-success px-6 py-3 text-sm font-semibold text-white hover:bg-success-600 hover:shadow-lg hover:shadow-success/25 transition-all"
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
              <div className="rounded-2xl border border-secondary-200 bg-white p-5 text-center hover:shadow-md transition-shadow">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 mb-3">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <p className="text-2xl font-bold text-secondary-900">
                  {perfurador.raio_atendimento_km} km
                </p>
                <p className="text-xs text-secondary-500 mt-1">
                  raio de atendimento
                </p>
              </div>
            )}

            {perfurador.profundidade_max_metros && (
              <div className="rounded-2xl border border-secondary-200 bg-white p-5 text-center hover:shadow-md transition-shadow">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 mb-3">
                  <Ruler className="h-6 w-6 text-accent" />
                </div>
                <p className="text-2xl font-bold text-secondary-900">
                  {perfurador.profundidade_max_metros} m
                </p>
                <p className="text-xs text-secondary-500 mt-1">
                  profundidade máx.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-secondary-200 bg-white p-5 text-center hover:shadow-md transition-shadow">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 mb-3">
                <Award className="h-6 w-6 text-success" />
              </div>
              <p className="text-2xl font-bold text-secondary-900">
                {perfurador.total_servicos}
              </p>
              <p className="text-xs text-secondary-500 mt-1">
                serviços realizados
              </p>
            </div>

            <div className="rounded-2xl border border-secondary-200 bg-white p-5 text-center hover:shadow-md transition-shadow">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 mb-3">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <p className="text-2xl font-bold text-secondary-900">24h</p>
              <p className="text-xs text-secondary-500 mt-1">
                tempo de resposta
              </p>
            </div>
          </section>

          {/* ── CONTACT INFO BAR ─────────────────────────────────────── */}
          <section className="rounded-2xl border border-secondary-200 bg-white p-4 sm:p-6">
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm">
              {perfurador.telefone && (
                <a
                  href={`tel:${perfurador.telefone}`}
                  className="flex items-center gap-2 text-secondary-600 hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  {perfurador.telefone}
                </a>
              )}
              {perfurador.email && (
                <a
                  href={`mailto:${perfurador.email}`}
                  className="flex items-center gap-2 text-secondary-600 hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  {perfurador.email}
                </a>
              )}
              {(perfurador.cidade || perfurador.estado) && (
                <span className="flex items-center gap-2 text-secondary-600">
                  <MapPin className="h-4 w-4 text-primary" />
                  {[perfurador.cidade, perfurador.estado]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
            </div>
          </section>

          {/* ── ESPECIALIDADES ───────────────────────────────────────── */}
          {(perfurador.tipos_servico.length > 0 ||
            perfurador.tipos_solo_experiencia.length > 0) && (
            <section>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-secondary-900">
                  Especialidades
                </h2>
                <p className="text-secondary-500 mt-1">
                  Serviços e experiências do profissional
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {perfurador.tipos_servico.length > 0 && (
                  <div className="rounded-2xl border border-secondary-200 bg-white p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-700">
                        <Wrench className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-secondary-900">
                          Serviços Oferecidos
                        </p>
                        <p className="text-xs text-secondary-500">
                          {perfurador.tipos_servico.length} tipos
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
                  <div className="rounded-2xl border border-secondary-200 bg-white p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-600">
                        <Droplets className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-secondary-900">
                          Experiência em Solos
                        </p>
                        <p className="text-xs text-secondary-500">
                          {perfurador.tipos_solo_experiencia.length} tipos
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
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-secondary-900">
                  Portfólio de Serviços
                </h2>
                <p className="text-secondary-500 mt-1">
                  Trabalhos realizados recentemente
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {servicos.map((s) => (
                  <div
                    key={s.id}
                    className="group rounded-2xl border border-secondary-200 bg-white overflow-hidden hover:shadow-lg transition-all"
                  >
                    {s.fotos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.fotos[0]}
                        alt="Foto do serviço"
                        className="h-44 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-secondary-50 to-secondary-100">
                        <Droplets className="h-12 w-12 text-secondary-200" />
                      </div>
                    )}
                    <div className="p-5 space-y-2">
                      {s.cliente_cidade && (
                        <p className="flex items-center gap-1.5 text-xs text-secondary-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {s.cliente_cidade}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        {s.profundidade_real_metros != null && (
                          <div>
                            <p className="text-2xl font-bold text-secondary-900">
                              {s.profundidade_real_metros}
                              <span className="text-sm font-normal text-secondary-500 ml-1">
                                m
                              </span>
                            </p>
                            <p className="text-xs text-secondary-400">
                              profundidade
                            </p>
                          </div>
                        )}
                        {s.vazao_litros_hora != null && (
                          <div className="text-right">
                            <p className="text-2xl font-bold text-accent">
                              {s.vazao_litros_hora}
                              <span className="text-sm font-normal text-secondary-500 ml-1">
                                L/h
                              </span>
                            </p>
                            <p className="text-xs text-secondary-400">vazão</p>
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
          <section className="rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-success/5 p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-secondary-900">
                Por que nos escolher?
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm mb-4">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-secondary-900 mb-1">
                  Garantia de Qualidade
                </h3>
                <p className="text-sm text-secondary-500">
                  Serviços com garantia e acompanhamento técnico
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm mb-4">
                  <Clock className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-semibold text-secondary-900 mb-1">
                  Resposta Rápida
                </h3>
                <p className="text-sm text-secondary-500">
                  Orçamento em até 24h após a solicitação
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm mb-4">
                  <Award className="h-7 w-7 text-success" />
                </div>
                <h3 className="font-semibold text-secondary-900 mb-1">
                  Experiência Comprovada
                </h3>
                <p className="text-sm text-secondary-500">
                  {perfurador.total_servicos} serviços realizados com sucesso
                </p>
              </div>
            </div>
          </section>

          {/* ── SOLICITAR ORÇAMENTO ──────────────────────────────────── */}
          <section id="solicitar" className="scroll-mt-20">
            <div className="rounded-3xl border border-secondary-200 bg-white p-6 sm:p-10 shadow-sm">
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-8">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-700 mb-4">
                    <MessageCircle className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-900">
                    Solicitar Orçamento Gratuito
                  </h2>
                  <p className="text-secondary-500 mt-2">
                    Preencha o formulário e{" "}
                    <span className="font-medium text-secondary-700">
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
        <footer className="mt-12 border-t border-secondary-200 bg-white py-8">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-secondary-400">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary" />
              <span>
                Perfil criado com{" "}
                <a
                  href={APP_URL}
                  className="text-primary hover:underline font-medium"
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
