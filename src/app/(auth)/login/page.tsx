"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, KeyRound, Sparkles } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
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
        email: email.trim(),
        otp: otp.trim(),
      });

      if (error) {
        toast.error(error.message || "Código inválido ou expirado");
        return;
      }

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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-700 shadow-xl shadow-primary/20 animate-pulse-glow">
            {step === "email" ? (
              <Mail className="h-8 w-8 text-white" />
            ) : (
              <KeyRound className="h-8 w-8 text-white" />
            )}
          </div>
          <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent shadow-md">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-2xl shadow-secondary-200/60 overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-success" />

        <CardContent className="p-6 sm:p-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-secondary-900">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-sm text-secondary-500 leading-relaxed">
              {step === "email"
                ? "Digite seu e-mail para receber o código de acesso"
                : "Digite o código de 6 dígitos enviado para seu e-mail"}
            </p>
          </div>

          {step === "email" ? (
            <form
              onSubmit={handleSendCode}
              className="space-y-5 animate-fade-in"
            >
              <Input
                id="email"
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
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
                    Enviar código de acesso
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
                <strong className="text-secondary-800">{email}</strong>
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
                className="w-full bg-gradient-to-r from-primary to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Entrar na minha conta"
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                }}
                className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-secondary-500 hover:text-primary transition-colors py-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Usar outro e-mail
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-secondary-100 text-center">
            <p className="text-sm text-secondary-500">
              Não tem conta?{" "}
              <Link
                href="/cadastro"
                className="font-bold text-primary hover:text-primary-700 transition-colors underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
              >
                Cadastre-se grátis
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
