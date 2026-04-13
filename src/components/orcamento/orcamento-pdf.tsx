"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link as PDFLink,
} from "@react-pdf/renderer";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Orcamento, Perfurador, Cliente } from "@/types";

const PRIMARY = "#2563EB";
const GRAY = "#64748B";
const DARK = "#1E293B";
const LIGHT_BG = "#F8FAFC";
const BORDER = "#E2E8F0";
const SUCCESS = "#16A34A";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: DARK },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  companyName: { fontSize: 18, fontWeight: "bold", color: PRIMARY },
  companyInfo: { fontSize: 9, color: GRAY, marginTop: 2 },
  // Title
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "bold", color: PRIMARY },
  refNum: { fontSize: 10, color: GRAY },
  // Dates
  dateRow: { flexDirection: "row", gap: 30, marginBottom: 20 },
  dateLabel: { fontSize: 9, color: GRAY },
  dateValue: { fontSize: 10, fontWeight: "bold", color: DARK },
  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginVertical: 14,
  },
  // Client block
  clientBlock: {
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    paddingLeft: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: DARK,
    marginBottom: 6,
  },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: "30%", fontSize: 9, color: GRAY },
  infoValue: { width: "70%", fontSize: 10, color: DARK },
  // Technical grid
  techGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  techItem: { width: "50%", marginBottom: 8 },
  techLabel: { fontSize: 9, color: GRAY },
  techValue: { fontSize: 10, fontWeight: "bold", color: DARK },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: LIGHT_BG,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableHeaderText: { fontWeight: "bold", fontSize: 9, color: GRAY },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  colDesc: { width: "40%" },
  colQtd: { width: "10%", textAlign: "center" },
  colUnid: { width: "15%" },
  colUnit: { width: "17.5%", textAlign: "right" },
  colSubt: { width: "17.5%", textAlign: "right" },
  // Totals
  totalsBlock: { alignItems: "flex-end", marginTop: 10 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
    width: 220,
  },
  totalLabel: {
    width: 120,
    textAlign: "right",
    marginRight: 10,
    fontSize: 10,
    color: GRAY,
  },
  totalValue: { width: 90, textAlign: "right", fontSize: 10, color: DARK },
  finalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 220,
    borderTopWidth: 2,
    borderTopColor: PRIMARY,
    paddingTop: 6,
    marginTop: 4,
  },
  finalLabel: {
    width: 120,
    textAlign: "right",
    marginRight: 10,
    fontSize: 12,
    fontWeight: "bold",
    color: DARK,
  },
  finalValue: {
    width: 90,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "bold",
    color: PRIMARY,
  },
  // Conditions
  condSection: { marginTop: 20 },
  condText: { fontSize: 10, color: DARK, marginBottom: 2 },
  // Signature area
  signatureSection: { marginTop: 30 },
  signatureGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 20,
  },
  signatureBox: { width: "45%", alignItems: "center" as const },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: DARK,
    width: "100%",
    marginBottom: 4,
  },
  signatureLabel: { fontSize: 9, color: GRAY, textAlign: "center" as const },
  // Public link
  linkSection: {
    marginTop: 16,
    padding: 10,
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  linkText: { fontSize: 8, color: GRAY },
  linkUrl: {
    fontSize: 8,
    color: PRIMARY,
    textDecoration: "underline" as const,
  },
  // Status badge
  statusBadge: {
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  // Logo
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain" as const,
    borderRadius: 6,
  },
  // Footer
  footer: {
    position: "absolute" as const,
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    fontSize: 8,
    color: GRAY,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  pageNumber: { fontSize: 8, color: GRAY },
});

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | Date) {
  return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
}

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
  const ref = `#${orcamento.id.slice(0, 8).toUpperCase()}`;
  const emissao = fmtDate(orcamento.created_at);
  const validade = fmtDate(
    addDays(new Date(orcamento.created_at), orcamento.validade_dias),
  );
  const itens = Array.isArray(orcamento.itens) ? orcamento.itens : [];
  const subtotal = itens.reduce((sum, i) => sum + i.qtd * i.valor_unit, 0);
  const desconto = orcamento.desconto ?? 0;
  const valorFinal = orcamento.valor_final ?? subtotal - desconto;

  const tipoServicoMap: Record<string, string> = {
    perfuracao: "Perfuração",
    manutencao: "Manutenção",
    limpeza: "Limpeza",
    bombeamento: "Bombeamento",
  };
  const tipoSoloMap: Record<string, string> = {
    rocha: "Rocha",
    areia: "Areia",
    argila: "Argila",
    misto: "Misto",
    nao_identificado: "Não identificado",
  };

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {perfurador.logo_url && (
              <Image src={perfurador.logo_url} style={s.logo} />
            )}
            <View>
              <Text style={s.companyName}>
                {perfurador.nome_empresa || perfurador.nome}
              </Text>
              <Text style={s.companyInfo}>
                {perfurador.telefone} | {perfurador.email}
              </Text>
              {perfurador.cidade && (
                <Text style={s.companyInfo}>
                  {perfurador.cidade}
                  {perfurador.estado ? ` - ${perfurador.estado}` : ""}
                </Text>
              )}
              {perfurador.cpf_cnpj && (
                <Text style={s.companyInfo}>
                  CPF/CNPJ: {perfurador.cpf_cnpj}
                </Text>
              )}
            </View>
          </View>
          {/* Status badge */}
          {orcamento.status !== "rascunho" && (
            <View
              style={[
                s.statusBadge,
                {
                  backgroundColor:
                    orcamento.status === "aprovado"
                      ? "#DCFCE7"
                      : orcamento.status === "cancelado"
                        ? "#FEE2E2"
                        : orcamento.status === "concluido"
                          ? "#D1FAE5"
                          : "#DBEAFE",
                  color:
                    orcamento.status === "aprovado"
                      ? SUCCESS
                      : orcamento.status === "cancelado"
                        ? "#DC2626"
                        : orcamento.status === "concluido"
                          ? "#059669"
                          : PRIMARY,
                },
              ]}
            >
              <Text style={{ fontSize: 9, fontWeight: "bold" }}>
                {orcamento.status === "aprovado"
                  ? "APROVADO"
                  : orcamento.status === "enviado"
                    ? "ENVIADO"
                    : orcamento.status === "concluido"
                      ? "CONCLUÍDO"
                      : orcamento.status === "cancelado"
                        ? "CANCELADO"
                        : orcamento.status === "em_execucao"
                          ? "EM EXECUÇÃO"
                          : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Title + Ref */}
        <View style={s.titleRow}>
          <Text style={s.title}>ORÇAMENTO</Text>
          <Text style={s.refNum}>{ref}</Text>
        </View>

        {/* Dates */}
        <View style={s.dateRow}>
          <View>
            <Text style={s.dateLabel}>Data de emissão</Text>
            <Text style={s.dateValue}>{emissao}</Text>
          </View>
          <View>
            <Text style={s.dateLabel}>Válido até</Text>
            <Text style={s.dateValue}>{validade}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Client */}
        {orcamento.cliente && (
          <View style={s.clientBlock}>
            <Text style={s.sectionTitle}>Cliente</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Nome:</Text>
              <Text style={s.infoValue}>{orcamento.cliente.nome}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Telefone:</Text>
              <Text style={s.infoValue}>{orcamento.cliente.telefone}</Text>
            </View>
            {orcamento.cliente.endereco && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Endereço:</Text>
                <Text style={s.infoValue}>{orcamento.cliente.endereco}</Text>
              </View>
            )}
            {(orcamento.cliente.cidade || orcamento.cliente.estado) && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Cidade/UF:</Text>
                <Text style={s.infoValue}>
                  {[orcamento.cliente.cidade, orcamento.cliente.estado]
                    .filter(Boolean)
                    .join(" - ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Technical */}
        {(orcamento.tipo_servico ||
          orcamento.profundidade_estimada_metros ||
          orcamento.diametro_polegadas ||
          orcamento.tipo_solo) && (
          <View style={{ marginBottom: 20 }}>
            <Text style={s.sectionTitle}>Dados Técnicos</Text>
            <View style={s.techGrid}>
              {orcamento.tipo_servico && (
                <View style={s.techItem}>
                  <Text style={s.techLabel}>Tipo de Serviço</Text>
                  <Text style={s.techValue}>
                    {tipoServicoMap[orcamento.tipo_servico] ||
                      orcamento.tipo_servico}
                  </Text>
                </View>
              )}
              {orcamento.profundidade_estimada_metros && (
                <View style={s.techItem}>
                  <Text style={s.techLabel}>Profundidade Estimada</Text>
                  <Text style={s.techValue}>
                    {orcamento.profundidade_estimada_metros}m
                  </Text>
                </View>
              )}
              {orcamento.diametro_polegadas && (
                <View style={s.techItem}>
                  <Text style={s.techLabel}>Diâmetro</Text>
                  <Text style={s.techValue}>
                    {orcamento.diametro_polegadas}&quot;
                  </Text>
                </View>
              )}
              {orcamento.tipo_solo && (
                <View style={s.techItem}>
                  <Text style={s.techLabel}>Tipo de Solo</Text>
                  <Text style={s.techValue}>
                    {tipoSoloMap[orcamento.tipo_solo] || orcamento.tipo_solo}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Items Table */}
        <Text style={s.sectionTitle}>Itens</Text>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colDesc]}>Descrição</Text>
          <Text style={[s.tableHeaderText, s.colQtd]}>Qtd</Text>
          <Text style={[s.tableHeaderText, s.colUnid]}>Unidade</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>Valor Unit.</Text>
          <Text style={[s.tableHeaderText, s.colSubt]}>Subtotal</Text>
        </View>
        {itens.map((item, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.colDesc}>{item.descricao}</Text>
            <Text style={[{ textAlign: "center" }, s.colQtd]}>{item.qtd}</Text>
            <Text style={s.colUnid}>{item.unidade}</Text>
            <Text style={[{ textAlign: "right" }, s.colUnit]}>
              {formatBRL(item.valor_unit)}
            </Text>
            <Text
              style={[{ textAlign: "right", fontWeight: "bold" }, s.colSubt]}
            >
              {formatBRL(item.qtd * item.valor_unit)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsBlock}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal:</Text>
            <Text style={s.totalValue}>{formatBRL(subtotal)}</Text>
          </View>
          {desconto > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Desconto:</Text>
              <Text style={[s.totalValue, { color: "#EF4444" }]}>
                - {formatBRL(desconto)}
              </Text>
            </View>
          )}
          <View style={s.finalRow}>
            <Text style={s.finalLabel}>TOTAL:</Text>
            <Text style={s.finalValue}>{formatBRL(valorFinal)}</Text>
          </View>
        </View>

        {/* Conditions */}
        {(orcamento.forma_pagamento || orcamento.prazo_execucao_dias) && (
          <View style={s.condSection}>
            <Text style={s.sectionTitle}>Condições</Text>
            {orcamento.forma_pagamento && (
              <Text style={s.condText}>
                Pagamento: {orcamento.forma_pagamento}
              </Text>
            )}
            {orcamento.prazo_execucao_dias && (
              <Text style={s.condText}>
                Prazo de execução: {orcamento.prazo_execucao_dias} dias úteis
              </Text>
            )}
          </View>
        )}

        {/* Observations */}
        {orcamento.observacoes && (
          <View style={s.condSection}>
            <Text style={s.sectionTitle}>Observações</Text>
            <Text style={s.condText}>{orcamento.observacoes}</Text>
          </View>
        )}

        {/* Signature Area */}
        <View style={s.signatureSection}>
          <Text style={s.sectionTitle}>Assinaturas</Text>
          <View style={s.signatureGrid}>
            <View style={s.signatureBox}>
              <View style={{ height: 40 }} />
              <View style={s.signatureLine} />
              <Text style={s.signatureLabel}>
                {perfurador.nome_empresa || perfurador.nome}
              </Text>
              <Text style={s.signatureLabel}>Contratado(a)</Text>
            </View>
            <View style={s.signatureBox}>
              <View style={{ height: 40 }} />
              <View style={s.signatureLine} />
              <Text style={s.signatureLabel}>
                {orcamento.cliente?.nome || "Cliente"}
              </Text>
              <Text style={s.signatureLabel}>Contratante</Text>
            </View>
          </View>
        </View>

        {/* Public link */}
        {publicUrl && (
          <View style={s.linkSection}>
            <Text style={s.linkText}>Visualize este orçamento online:</Text>
            <PDFLink src={publicUrl}>
              <Text style={s.linkUrl}>{publicUrl}</Text>
            </PDFLink>
          </View>
        )}

        {/* Footer with page numbers */}
        <View style={s.footer} fixed>
          <Text>Orçamento gerado pelo NexaDrill — nexadrill.com.br</Text>
          <Text
            style={s.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
