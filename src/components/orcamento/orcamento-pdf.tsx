"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link as PDFLink,
  Svg,
  Circle,
  Rect,
  Path,
} from "@react-pdf/renderer";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Orcamento, Perfurador, Cliente } from "@/types";

// ─── Color Palette ────────────────────────────────────────────────────────────
const PRIMARY = "#1e40af";
const PRIMARY_LIGHT = "#3b82f6";
const PRIMARY_LIGHTER = "#dbeafe";
const PRIMARY_DARK = "#1e3a8a";
const ACCENT = "#f59e0b";
const ACCENT_LIGHT = "#fef3c7";
const SUCCESS = "#059669";
const SUCCESS_LIGHT = "#d1fae5";
const DANGER = "#dc2626";
const DANGER_LIGHT = "#fee2e2";
const GRAY = "#64748b";
const GRAY_LIGHT = "#94a3b8";
const DARK = "#0f172a";
const DARK_MEDIUM = "#1e293b";
const LIGHT_BG = "#f8fafc";
const WHITE = "#ffffff";
const BORDER = "#e2e8f0";
const BORDER_LIGHT = "#f1f5f9";

// ─── SVG Icons (inline for PDF) ───────────────────────────────────────────────
function IconPhone() {
  return (
    <Svg viewBox="0 0 24 24" width={10} height={10}>
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0 1 22 16.92z"
        fill="none"
        stroke={PRIMARY_LIGHT}
        strokeWidth={2}
      />
    </Svg>
  );
}

function IconMail() {
  return (
    <Svg viewBox="0 0 24 24" width={10} height={10}>
      <Rect
        x={2}
        y={4}
        width={20}
        height={16}
        rx={2}
        fill="none"
        stroke={PRIMARY_LIGHT}
        strokeWidth={2}
      />
      <Path
        d="M22 7l-10 7L2 7"
        fill="none"
        stroke={PRIMARY_LIGHT}
        strokeWidth={2}
      />
    </Svg>
  );
}

function IconMapPin() {
  return (
    <Svg viewBox="0 0 24 24" width={10} height={10}>
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        fill="none"
        stroke={PRIMARY_LIGHT}
        strokeWidth={2}
      />
      <Circle
        cx={12}
        cy={10}
        r={3}
        fill="none"
        stroke={PRIMARY_LIGHT}
        strokeWidth={2}
      />
    </Svg>
  );
}

function IconCalendar() {
  return (
    <Svg viewBox="0 0 24 24" width={10} height={10}>
      <Rect
        x={3}
        y={4}
        width={18}
        height={18}
        rx={2}
        fill="none"
        stroke={GRAY}
        strokeWidth={2}
      />
      <Path
        d="M16 2v4M8 2v4M3 10h18"
        fill="none"
        stroke={GRAY}
        strokeWidth={2}
      />
    </Svg>
  );
}

function IconCheck() {
  return (
    <Svg viewBox="0 0 24 24" width={8} height={8}>
      <Path d="M20 6L9 17l-5-5" fill="none" stroke={SUCCESS} strokeWidth={3} />
    </Svg>
  );
}

function IconWrench() {
  return (
    <Svg viewBox="0 0 24 24" width={10} height={10}>
      <Path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        fill="none"
        stroke={PRIMARY_LIGHT}
        strokeWidth={2}
      />
    </Svg>
  );
}

// ─── Stylesheet ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: DARK_MEDIUM,
  },
  body: {
    paddingHorizontal: 40,
    paddingBottom: 65,
  },

  // ── Header Banner ──
  headerBanner: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 40,
    paddingVertical: 22,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: "contain" as const,
    borderRadius: 8,
    backgroundColor: WHITE,
  },
  companyName: {
    fontSize: 17,
    fontWeight: "bold",
    color: WHITE,
    letterSpacing: 0.3,
  },
  companyInfoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 2,
  },
  companyInfo: {
    fontSize: 8.5,
    color: "#93c5fd",
  },
  headerRight: {
    alignItems: "flex-end" as const,
  },
  docLabel: {
    fontSize: 8,
    color: "#93c5fd",
    letterSpacing: 1,
    marginBottom: 2,
  },
  docTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: WHITE,
    letterSpacing: 1.5,
  },
  refBadge: {
    marginTop: 4,
    backgroundColor: "#2563eb",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  refText: {
    fontSize: 8,
    color: "#bfdbfe",
    fontWeight: "bold",
  },

  // ── Accent bar ──
  accentBar: {
    height: 3,
    backgroundColor: ACCENT,
  },

  // ── Info Strip (dates + status) ──
  infoStrip: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 40,
    paddingVertical: 12,
    backgroundColor: LIGHT_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  infoStripDates: {
    flexDirection: "row" as const,
    gap: 30,
  },
  dateBlock: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  dateLabel: {
    fontSize: 8,
    color: GRAY,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: DARK,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  // ── Section headers ──
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
    marginTop: 18,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: PRIMARY_LIGHTER,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: PRIMARY_DARK,
    letterSpacing: 0.3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
    marginLeft: 8,
  },

  // ── Client / Info Cards ──
  infoCard: {
    backgroundColor: LIGHT_BG,
    borderRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  infoCardAccent: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: PRIMARY_LIGHT,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  infoRow: {
    flexDirection: "row" as const,
    marginBottom: 4,
    paddingLeft: 6,
  },
  infoLabel: {
    width: "28%",
    fontSize: 8.5,
    color: GRAY,
    fontWeight: "bold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  infoValue: {
    width: "72%",
    fontSize: 9.5,
    color: DARK,
  },

  // ── Tech Grid ──
  techGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  techCard: {
    width: "48%",
    backgroundColor: LIGHT_BG,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  techLabel: {
    fontSize: 7.5,
    color: GRAY,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  techValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: PRIMARY_DARK,
  },

  // ── Table ──
  tableContainer: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden" as const,
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: "row" as const,
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tableHeaderText: {
    fontWeight: "bold",
    fontSize: 8,
    color: WHITE,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row" as const,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_LIGHT,
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  tableRowNum: {
    fontSize: 8,
    color: GRAY_LIGHT,
    fontWeight: "bold",
    marginRight: 6,
  },
  colNum: { width: "6%" },
  colDesc: { width: "38%" },
  colQtd: { width: "8%", textAlign: "center" as const },
  colUnid: { width: "13%" },
  colUnit: { width: "17.5%", textAlign: "right" as const },
  colSubt: { width: "17.5%", textAlign: "right" as const },

  // ── Totals ──
  totalsContainer: {
    marginTop: 12,
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
  },
  totalsBox: {
    width: 240,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden" as const,
  },
  totalRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  totalLabel: {
    fontSize: 9,
    color: GRAY,
  },
  totalValue: {
    fontSize: 9.5,
    color: DARK,
    fontWeight: "bold",
  },
  finalRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  finalLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: WHITE,
  },
  finalValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: WHITE,
  },

  // ── Conditions ──
  condGrid: {
    flexDirection: "row" as const,
    gap: 10,
    marginTop: 6,
  },
  condCard: {
    flex: 1,
    backgroundColor: LIGHT_BG,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  condLabel: {
    fontSize: 7.5,
    color: GRAY,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  condValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: DARK,
  },

  // ── Observations ──
  obsBox: {
    marginTop: 6,
    padding: 12,
    backgroundColor: ACCENT_LIGHT,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  obsLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#92400e",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  obsText: {
    fontSize: 9.5,
    color: "#78350f",
    lineHeight: 1.5,
  },

  // ── Signature ──
  signatureSection: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  signatureGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    marginTop: 14,
  },
  signatureBox: {
    width: "40%",
    alignItems: "center" as const,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: DARK_MEDIUM,
    width: "100%",
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 9,
    fontWeight: "bold",
    color: DARK,
    textAlign: "center" as const,
  },
  signatureRole: {
    fontSize: 7.5,
    color: GRAY,
    textAlign: "center" as const,
    marginTop: 1,
  },

  // ── Link / QR section ──
  linkSection: {
    marginTop: 14,
    padding: 10,
    backgroundColor: PRIMARY_LIGHTER,
    borderRadius: 6,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  linkIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  linkText: {
    fontSize: 7.5,
    color: GRAY,
  },
  linkUrl: {
    fontSize: 8,
    color: PRIMARY,
    fontWeight: "bold",
    textDecoration: "underline" as const,
  },

  // ── Footer ──
  footer: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingVertical: 10,
    backgroundColor: DARK,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  footerText: {
    fontSize: 7.5,
    color: GRAY_LIGHT,
  },
  footerBrand: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: PRIMARY_LIGHT,
  },
  pageNumber: {
    fontSize: 7.5,
    color: GRAY_LIGHT,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | Date) {
  return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
}

function fmtDateLong(d: string | Date) {
  return format(new Date(d), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function getStatusConfig(status: string) {
  switch (status) {
    case "aprovado":
      return { label: "APROVADO", bg: SUCCESS_LIGHT, color: SUCCESS };
    case "enviado":
      return { label: "ENVIADO", bg: PRIMARY_LIGHTER, color: PRIMARY };
    case "concluido":
      return { label: "CONCLUÍDO", bg: "#d1fae5", color: "#059669" };
    case "cancelado":
      return { label: "CANCELADO", bg: DANGER_LIGHT, color: DANGER };
    case "em_execucao":
      return { label: "EM EXECUÇÃO", bg: ACCENT_LIGHT, color: "#d97706" };
    default:
      return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface OrcamentoPDFProps {
  orcamento: Orcamento & { cliente?: Cliente };
  perfurador: Perfurador;
  publicUrl?: string;
}

export function OrcamentoPDF({
  orcamento,
  perfurador,
  publicUrl,
}: OrcamentoPDFProps) {
  const ref = `ORC-${orcamento.id.slice(0, 8).toUpperCase()}`;
  const emissao = fmtDate(orcamento.created_at);
  const emissaoLong = fmtDateLong(orcamento.created_at);
  const validade = fmtDate(
    addDays(new Date(orcamento.created_at), orcamento.validade_dias),
  );
  const itens = Array.isArray(orcamento.itens) ? orcamento.itens : [];
  const subtotal = itens.reduce((sum, i) => sum + i.qtd * i.valor_unit, 0);
  const desconto = orcamento.desconto ?? 0;
  const valorFinal = orcamento.valor_final ?? subtotal - desconto;

  const tipoServicoMap: Record<string, string> = {
    perfuracao: "Perfuração de Poço",
    manutencao: "Manutenção",
    limpeza: "Limpeza de Poço",
    bombeamento: "Teste de Bombeamento",
  };
  const tipoSoloMap: Record<string, string> = {
    rocha: "Rocha",
    areia: "Areia",
    argila: "Argila",
    misto: "Misto",
    nao_identificado: "Não identificado",
  };

  const statusCfg = getStatusConfig(orcamento.status);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ─── Header Banner ─── */}
        <View style={s.headerBanner}>
          <View style={s.headerLeft}>
            {perfurador.logo_url && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={perfurador.logo_url} style={s.logo} />
            )}
            <View>
              <Text style={s.companyName}>
                {perfurador.nome_empresa || perfurador.nome}
              </Text>
              <View style={s.companyInfoRow}>
                <IconPhone />
                <Text style={s.companyInfo}>{perfurador.telefone}</Text>
                <Text style={[s.companyInfo, { marginHorizontal: 4 }]}>|</Text>
                <IconMail />
                <Text style={s.companyInfo}>{perfurador.email}</Text>
              </View>
              {perfurador.cidade && (
                <View style={s.companyInfoRow}>
                  <IconMapPin />
                  <Text style={s.companyInfo}>
                    {perfurador.cidade}
                    {perfurador.estado ? ` - ${perfurador.estado}` : ""}
                  </Text>
                </View>
              )}
              {perfurador.cpf_cnpj && (
                <Text style={[s.companyInfo, { marginTop: 1 }]}>
                  CPF/CNPJ: {perfurador.cpf_cnpj}
                </Text>
              )}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docLabel}>DOCUMENTO</Text>
            <Text style={s.docTitle}>ORÇAMENTO</Text>
            <View style={s.refBadge}>
              <Text style={s.refText}>{ref}</Text>
            </View>
          </View>
        </View>

        {/* ─── Accent Bar ─── */}
        <View style={s.accentBar} />

        {/* ─── Info Strip (dates + status) ─── */}
        <View style={s.infoStrip}>
          <View style={s.infoStripDates}>
            <View style={s.dateBlock}>
              <IconCalendar />
              <View>
                <Text style={s.dateLabel}>Emissão</Text>
                <Text style={s.dateValue}>{emissao}</Text>
              </View>
            </View>
            <View style={s.dateBlock}>
              <IconCalendar />
              <View>
                <Text style={s.dateLabel}>Validade</Text>
                <Text style={s.dateValue}>{validade}</Text>
              </View>
            </View>
          </View>
          {statusCfg && (
            <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[s.statusText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          )}
        </View>

        {/* ─── Body ─── */}
        <View style={s.body}>
          {/* ── Client ── */}
          {orcamento.cliente && (
            <>
              <View style={s.sectionHeader}>
                <View style={s.sectionIcon}>
                  <Svg viewBox="0 0 24 24" width={11} height={11}>
                    <Path
                      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                      fill="none"
                      stroke={PRIMARY_LIGHT}
                      strokeWidth={2}
                    />
                    <Circle
                      cx={12}
                      cy={7}
                      r={4}
                      fill="none"
                      stroke={PRIMARY_LIGHT}
                      strokeWidth={2}
                    />
                  </Svg>
                </View>
                <Text style={s.sectionTitle}>Dados do Cliente</Text>
                <View style={s.sectionLine} />
              </View>
              <View style={s.infoCard}>
                <View style={s.infoCardAccent} />
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Nome</Text>
                  <Text style={[s.infoValue, { fontWeight: "bold" }]}>
                    {orcamento.cliente.nome}
                  </Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Telefone</Text>
                  <Text style={s.infoValue}>{orcamento.cliente.telefone}</Text>
                </View>
                {orcamento.cliente.email && (
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>E-mail</Text>
                    <Text style={s.infoValue}>{orcamento.cliente.email}</Text>
                  </View>
                )}
                {orcamento.cliente.endereco && (
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Endereço</Text>
                    <Text style={s.infoValue}>
                      {orcamento.cliente.endereco}
                    </Text>
                  </View>
                )}
                {(orcamento.cliente.cidade || orcamento.cliente.estado) && (
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Cidade / UF</Text>
                    <Text style={s.infoValue}>
                      {[orcamento.cliente.cidade, orcamento.cliente.estado]
                        .filter(Boolean)
                        .join(" — ")}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── Technical Data ── */}
          {(orcamento.tipo_servico ||
            orcamento.profundidade_estimada_metros ||
            orcamento.diametro_polegadas ||
            orcamento.tipo_solo) && (
            <>
              <View style={s.sectionHeader}>
                <View style={s.sectionIcon}>
                  <IconWrench />
                </View>
                <Text style={s.sectionTitle}>Dados Técnicos</Text>
                <View style={s.sectionLine} />
              </View>
              <View style={s.techGrid}>
                {orcamento.tipo_servico && (
                  <View style={s.techCard}>
                    <Text style={s.techLabel}>Tipo de Serviço</Text>
                    <Text style={s.techValue}>
                      {tipoServicoMap[orcamento.tipo_servico] ||
                        orcamento.tipo_servico}
                    </Text>
                  </View>
                )}
                {orcamento.profundidade_estimada_metros && (
                  <View style={s.techCard}>
                    <Text style={s.techLabel}>Profundidade Estimada</Text>
                    <Text style={s.techValue}>
                      {orcamento.profundidade_estimada_metros} metros
                    </Text>
                  </View>
                )}
                {orcamento.diametro_polegadas && (
                  <View style={s.techCard}>
                    <Text style={s.techLabel}>Diâmetro</Text>
                    <Text style={s.techValue}>
                      {orcamento.diametro_polegadas}&quot;
                    </Text>
                  </View>
                )}
                {orcamento.tipo_solo && (
                  <View style={s.techCard}>
                    <Text style={s.techLabel}>Tipo de Solo</Text>
                    <Text style={s.techValue}>
                      {tipoSoloMap[orcamento.tipo_solo] || orcamento.tipo_solo}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── Items Table ── */}
          <View style={s.sectionHeader}>
            <View style={s.sectionIcon}>
              <Svg viewBox="0 0 24 24" width={11} height={11}>
                <Path
                  d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                  fill="none"
                  stroke={PRIMARY_LIGHT}
                  strokeWidth={2}
                />
                <Rect
                  x={9}
                  y={3}
                  width={6}
                  height={4}
                  rx={1}
                  fill="none"
                  stroke={PRIMARY_LIGHT}
                  strokeWidth={2}
                />
              </Svg>
            </View>
            <Text style={s.sectionTitle}>
              {itens.length > 0 ? "Itens do Orçamento" : "Valor do Serviço"}
            </Text>
            <View style={s.sectionLine} />
          </View>

          {itens.length > 0 ? (
            <>
              {/* ── Items Table ── */}
              <View style={s.tableContainer}>
                <View style={s.tableHeader}>
                  <Text style={[s.tableHeaderText, s.colNum]}>#</Text>
                  <Text style={[s.tableHeaderText, s.colDesc]}>Descrição</Text>
                  <Text style={[s.tableHeaderText, s.colQtd]}>Qtd</Text>
                  <Text style={[s.tableHeaderText, s.colUnid]}>Unidade</Text>
                  <Text style={[s.tableHeaderText, s.colUnit]}>
                    Valor Unit.
                  </Text>
                  <Text style={[s.tableHeaderText, s.colSubt]}>Subtotal</Text>
                </View>
                {itens.map((item, i) => (
                  <View
                    key={i}
                    style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                  >
                    <Text style={[s.colNum, s.tableRowNum]}>
                      {String(i + 1).padStart(2, "0")}
                    </Text>
                    <Text style={[s.colDesc, { fontSize: 9.5 }]}>
                      {item.descricao}
                    </Text>
                    <Text
                      style={[
                        s.colQtd,
                        { textAlign: "center", fontWeight: "bold" },
                      ]}
                    >
                      {item.qtd}
                    </Text>
                    <Text style={[s.colUnid, { fontSize: 9, color: GRAY }]}>
                      {item.unidade}
                    </Text>
                    <Text style={[s.colUnit, { textAlign: "right" }]}>
                      {formatBRL(item.valor_unit)}
                    </Text>
                    <Text
                      style={[
                        s.colSubt,
                        { textAlign: "right", fontWeight: "bold", color: DARK },
                      ]}
                    >
                      {formatBRL(item.qtd * item.valor_unit)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* ── Totals ── */}
              <View style={s.totalsContainer}>
                <View style={s.totalsBox}>
                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>Subtotal</Text>
                    <Text style={s.totalValue}>{formatBRL(subtotal)}</Text>
                  </View>
                  {desconto > 0 && (
                    <View
                      style={[s.totalRow, { backgroundColor: DANGER_LIGHT }]}
                    >
                      <Text style={[s.totalLabel, { color: DANGER }]}>
                        Desconto
                      </Text>
                      <Text style={[s.totalValue, { color: DANGER }]}>
                        - {formatBRL(desconto)}
                      </Text>
                    </View>
                  )}
                  <View style={s.finalRow}>
                    <Text style={s.finalLabel}>VALOR TOTAL</Text>
                    <Text style={s.finalValue}>{formatBRL(valorFinal)}</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            /* ── No items — show global value block ── */
            <View
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: BORDER,
                overflow: "hidden" as const,
                marginTop: 6,
              }}
            >
              {/* Description row */}
              <View
                style={{
                  flexDirection: "row" as const,
                  justifyContent: "space-between" as const,
                  alignItems: "center" as const,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: LIGHT_BG,
                  borderBottomWidth: 1,
                  borderBottomColor: BORDER,
                }}
              >
                <View
                  style={{
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: PRIMARY_LIGHTER,
                      justifyContent: "center" as const,
                      alignItems: "center" as const,
                    }}
                  >
                    <Svg viewBox="0 0 24 24" width={14} height={14}>
                      <Path
                        d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                        fill="none"
                        stroke={PRIMARY}
                        strokeWidth={2}
                      />
                    </Svg>
                  </View>
                  <View>
                    <Text
                      style={{ fontSize: 10, fontWeight: "bold", color: DARK }}
                    >
                      {orcamento.tipo_servico
                        ? tipoServicoMap[orcamento.tipo_servico] ||
                          orcamento.tipo_servico
                        : "Serviço de Perfuração"}
                    </Text>
                    <Text style={{ fontSize: 8, color: GRAY, marginTop: 1 }}>
                      Valor global do serviço
                    </Text>
                  </View>
                </View>
                {desconto > 0 && (
                  <View
                    style={{
                      backgroundColor: DANGER_LIGHT,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                    }}
                  >
                    <Text
                      style={{ fontSize: 8, color: DANGER, fontWeight: "bold" }}
                    >
                      Desconto: - {formatBRL(desconto)}
                    </Text>
                  </View>
                )}
              </View>
              {/* Value row */}
              <View style={s.finalRow}>
                <Text style={s.finalLabel}>VALOR TOTAL</Text>
                <Text style={s.finalValue}>{formatBRL(valorFinal)}</Text>
              </View>
            </View>
          )}

          {/* ── Conditions ── */}
          {(orcamento.forma_pagamento || orcamento.prazo_execucao_dias) && (
            <>
              <View style={s.sectionHeader}>
                <View style={s.sectionIcon}>
                  <IconCheck />
                </View>
                <Text style={s.sectionTitle}>Condições Comerciais</Text>
                <View style={s.sectionLine} />
              </View>
              <View style={s.condGrid}>
                {orcamento.forma_pagamento && (
                  <View style={s.condCard}>
                    <Text style={s.condLabel}>Forma de Pagamento</Text>
                    <Text style={s.condValue}>{orcamento.forma_pagamento}</Text>
                  </View>
                )}
                {orcamento.prazo_execucao_dias && (
                  <View style={s.condCard}>
                    <Text style={s.condLabel}>Prazo de Execução</Text>
                    <Text style={s.condValue}>
                      {orcamento.prazo_execucao_dias} dias úteis
                    </Text>
                  </View>
                )}
                <View style={s.condCard}>
                  <Text style={s.condLabel}>Validade da Proposta</Text>
                  <Text style={s.condValue}>
                    {orcamento.validade_dias} dias
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* ── Observations ── */}
          {orcamento.observacoes && (
            <>
              <View style={s.sectionHeader}>
                <View
                  style={[s.sectionIcon, { backgroundColor: ACCENT_LIGHT }]}
                >
                  <Svg viewBox="0 0 24 24" width={11} height={11}>
                    <Circle
                      cx={12}
                      cy={12}
                      r={10}
                      fill="none"
                      stroke={ACCENT}
                      strokeWidth={2}
                    />
                    <Path
                      d="M12 16v-4M12 8h.01"
                      fill="none"
                      stroke={ACCENT}
                      strokeWidth={2}
                    />
                  </Svg>
                </View>
                <Text style={[s.sectionTitle, { color: "#92400e" }]}>
                  Observações
                </Text>
                <View style={s.sectionLine} />
              </View>
              <View style={s.obsBox}>
                <Text style={s.obsText}>{orcamento.observacoes}</Text>
              </View>
            </>
          )}

          {/* ── Signatures ── */}
          <View style={s.signatureSection}>
            <View style={s.signatureGrid}>
              <View style={s.signatureBox}>
                <View style={{ height: 40 }} />
                <View style={s.signatureLine} />
                <Text style={s.signatureName}>
                  {perfurador.nome_empresa || perfurador.nome}
                </Text>
                <Text style={s.signatureRole}>Contratado(a)</Text>
              </View>
              <View style={s.signatureBox}>
                <View style={{ height: 40 }} />
                <View style={s.signatureLine} />
                <Text style={s.signatureName}>
                  {orcamento.cliente?.nome || "Cliente"}
                </Text>
                <Text style={s.signatureRole}>Contratante</Text>
              </View>
            </View>
          </View>

          {/* ── Public link ── */}
          {publicUrl && (
            <View style={s.linkSection}>
              <View style={s.linkIcon}>
                <Svg viewBox="0 0 24 24" width={10} height={10}>
                  <Path
                    d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                    fill="none"
                    stroke={WHITE}
                    strokeWidth={2}
                  />
                  <Path
                    d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                    fill="none"
                    stroke={WHITE}
                    strokeWidth={2}
                  />
                </Svg>
              </View>
              <View>
                <Text style={s.linkText}>Visualize este orçamento online:</Text>
                <PDFLink src={publicUrl}>
                  <Text style={s.linkUrl}>{publicUrl}</Text>
                </PDFLink>
              </View>
            </View>
          )}
        </View>

        {/* ─── Footer ─── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Documento emitido em {emissaoLong}</Text>
          <Text style={s.footerBrand}>NexaDrill — nexadrill.com.br</Text>
          <Text
            style={s.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
