"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  ArrowLeft,
  UserPlus,
  Sparkles,
  CheckCircle,
  KeyRound,
} from "lucide-react";
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
    <div className="space-y-6">
      {/* Header icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-success to-success-700 shadow-xl shadow-success/20 animate-pulse-glow">
            {step === "form" ? (
              <UserPlus className="h-8 w-8 text-white" />
            ) : (
              <KeyRound className="h-8 w-8 text-white" />
            )}
          </div>
          <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent shadow-md">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${step === "form" ? "bg-primary text-white shadow-md" : "bg-success-100 text-success-700"}`}
        >
          {step === "otp" ? (
            <CheckCircle className="h-3.5 w-3.5" />
          ) : (
            <span className="h-4 w-4 flex items-center justify-center rounded-full bg-white/30 text-[10px]">
              1
            </span>
          )}
          Dados
        </div>
        <div className="w-8 h-0.5 bg-secondary-200 rounded-full" />
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${step === "otp" ? "bg-primary text-white shadow-md" : "bg-secondary-100 text-secondary-400"}`}
        >
          <span className="h-4 w-4 flex items-center justify-center rounded-full bg-white/30 text-[10px]">
            2
          </span>
          Verificação
        </div>
      </div>

      <Card className="border-0 shadow-2xl shadow-secondary-200/60 overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-success via-primary to-accent" />

        <CardContent className="p-6 sm:p-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-secondary-900">
              Crie sua conta
            </h2>
            <p className="mt-2 text-sm text-secondary-500 leading-relaxed">
              {step === "form"
                ? "Comece a gerenciar seus serviços de perfuração"
                : "Digite o código de 6 dígitos enviado para seu e-mail"}
            </p>
          </div>

          {step === "form" ? (
            <form
              onSubmit={handleSendCode}
              className="space-y-4 animate-fade-in"
            >
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  label="Empresa"
                  placeholder="Nome da empresa"
                  autoComplete="organization"
                  value={formData.empresa}
                  onChange={handleChange("empresa")}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all mt-2"
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
                    Continuar com e-mail
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={handleVerifyOtp}
              className="space-y-5 animate-fade-in"
            >
              <div className="rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-100 px-4 py-3 text-sm text-secondary-600">
                <span className="font-medium text-primary">
                  📧 Código enviado para
                </span>
                <br />
                <strong className="text-secondary-800">{formData.email}</strong>
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
                className="w-full bg-gradient-to-r from-success to-success-600 hover:from-success-600 hover:to-success-700 shadow-lg shadow-success/25 hover:shadow-xl hover:shadow-success/30 transition-all"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Criar minha conta
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setOtp("");
                }}
                className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-secondary-500 hover:text-primary transition-colors py-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-secondary-100 text-center">
            <p className="text-sm text-secondary-500">
              Já tem conta?{" "}
              <Link
                href="/login"
                className="font-bold text-primary hover:text-primary-700 transition-colors underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
              >
                Faça login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trust signals */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-secondary-400 animate-fade-in delay-300">
        {["Gratuito para sempre", "Sem cartão de crédito", "Dados seguros"].map(
          (item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              {item}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
