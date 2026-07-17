/**
 * Teste de integração com o Asaas (sandbox).
 * Cria um cliente + cobrança Pix de R$1 e busca o QR Code — prova que a app
 * consegue gerar cobranças/QR com a chave e URL configuradas no .env.local.
 *
 * Uso: npx tsx scripts/test-asaas.ts
 * (Cria dados no ambiente configurado em ASAAS_API_URL — use sandbox!)
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const asaas = await import("../src/lib/asaas");

  console.log("URL Asaas:        ", process.env.ASAAS_API_URL);
  console.log("Configurado:      ", asaas.asaasConfigured());
  if (!asaas.asaasConfigured()) {
    throw new Error(
      "Asaas não configurado — verifique ASAAS_API_URL e a chave (escapada com \\$).",
    );
  }

  const due = new Date();
  due.setDate(due.getDate() + 3);
  const dueDate = due.toISOString().slice(0, 10);

  console.log("\n1) Criando cliente de teste no Asaas...");
  const cust = await asaas.createCustomer({
    name: "Cliente Teste QR (NexaDrill)",
    cpfCnpj: "24971563792",
    email: "teste-qr@example.com",
    mobilePhone: "51999990000",
  });
  console.log("   ✔ customer id:", cust.id);

  console.log("\n2) Criando cobrança Pix de R$ 10,00...");
  const pay = await asaas.createPayment({
    customer: cust.id,
    billingType: "PIX",
    value: 10.0,
    dueDate,
    description: "Teste de QR (sandbox)",
    externalReference: "teste-" + Date.now(),
  });
  console.log("   ✔ payment id:", pay.id);
  console.log("   ✔ link de pagamento:", pay.invoiceUrl);

  console.log("\n3) Buscando o QR Code Pix...");
  const qr = await asaas.getPixQrCode(pay.id);
  console.log(
    "   ✔ copia-e-cola (início):",
    (qr.payload || "").slice(0, 40) + "...",
  );
  console.log("   ✔ tamanho do copia-e-cola:", (qr.payload || "").length);
  console.log("   ✔ tamanho da imagem (base64):", (qr.encodedImage || "").length);

  console.log(
    "\n✅ SUCESSO — o app consegue autenticar, criar cobrança e gerar QR Pix.",
  );
}

main().catch((e) => {
  console.error("\n❌ FALHOU:", e.message);
  console.error(
    "   Dicas: confira a URL (sandbox x prod), a chave do ambiente certo,\n" +
      "   e se a chave está escapada no .env (ASAAS_API_KEY=\\$aact_...).",
  );
  process.exit(1);
});
