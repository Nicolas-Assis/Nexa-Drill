"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ensurePerfurador } from "@/app/(auth)/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type FormData = {
  nome: string;
  telefone: string;
  empresa: string;
  email: string;
};

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    telefone: "",
    empresa: "",
    email: "",
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    const { nome, telefone, empresa, email } = formData;

    if (!nome.trim() || !email.trim() || !telefone.trim() || !empresa.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      });

      if (error) {
        toast.error(error.message || "Erro ao enviar código");
        return;
      }

      toast.success("Código enviado! Verifique seu e-mail.");
      setStep("otp");
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email: formData.email.trim(),
        otp: otp.trim(),
      });

      if (error) {
        toast.error(error.message || "Código inválido ou expirado");
        return;
      }

      // Atualizar perfurador com os dados de cadastro
      await ensurePerfurador(
        formData.nome.trim(),
        formData.telefone.trim(),
        formData.empresa.trim(),
      );

      toast.success("Conta criada com sucesso!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-xl shadow-secondary-200/50">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-secondary-900">
            Crie sua conta
          </h2>
          <p className="mt-1 text-sm text-secondary-500">
            {step === "form"
              ? "Comece a gerenciar seus serviços de perfuração"
              : "Digite o código enviado para seu e-mail"}
          </p>
        </div>

        {step === "form" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <Input
              id="nome"
              label="Nome completo"
              placeholder="Seu nome completo"
              autoComplete="name"
              value={formData.nome}
              onChange={handleChange("nome")}
              required
            />
            <Input
              id="email"
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange("email")}
              required
            />
            <Input
              id="telefone"
              label="Telefone"
              placeholder="(00) 00000-0000"
              autoComplete="tel"
              value={formData.telefone}
              onChange={handleChange("telefone")}
              required
            />
            <Input
              id="empresa"
              label="Nome da Empresa"
              placeholder="Nome da sua empresa"
              autoComplete="organization"
              value={formData.empresa}
              onChange={handleChange("empresa")}
              required
            />
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar código
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-lg bg-secondary-50 px-4 py-3 text-sm text-secondary-600">
              Código enviado para <strong>{formData.email}</strong>
            </div>
            <Input
              id="otp"
              label="Código de 6 dígitos"
              type="text"
              placeholder="000000"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
            />
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar conta"
              )}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setOtp("");
              }}
              className="flex w-full items-center justify-center gap-1 text-sm text-secondary-500 hover:text-secondary-700"
            >
              <ArrowLeft className="h-3 w-3" /> Voltar
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-secondary-500">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:text-primary-700 transition-colors"
          >
            Faça login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
