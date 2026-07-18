"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, UserCheck, Server, Lock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { usePerfurador } from "@/hooks/use-perfurador";
import { startTour } from "@/lib/onboarding";

const CONSENT_VERSION = "v1";
const storageKey = (id: string) => `nexadrill:consent:${CONSENT_VERSION}:${id}`;

const PONTOS = [
  {
    icon: UserCheck,
    texto:
      "Você é o controlador dos dados dos seus clientes e os utiliza apenas para gerir seus serviços.",
  },
  {
    icon: Server,
    texto:
      "O NexaDrill atua como operador, tratando os dados conforme a LGPD (Lei nº 13.709/2018).",
  },
  {
    icon: Lock,
    texto:
      "Seus dados ficam isolados por conta e protegidos por controle de acesso. Não vendemos seus dados.",
  },
];

export function LgpdConsent() {
  const { perfurador } = usePerfurador();
  const [open, setOpen] = useState(false);
  const [aceito, setAceito] = useState(false);

  useEffect(() => {
    if (!perfurador?.id) return;
    try {
      const done = window.localStorage.getItem(storageKey(perfurador.id));
      if (!done) setOpen(true);
    } catch {
      // localStorage indisponível — não bloqueia o app
    }
  }, [perfurador?.id]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  function aceitar() {
    if (!perfurador?.id) return;
    try {
      window.localStorage.setItem(
        storageKey(perfurador.id),
        new Date().toISOString(),
      );
    } catch {
      // ignora falha de persistência
    }
    setOpen(false);
    // Emenda o tour de boas-vindas logo após o aceite
    setTimeout(() => startTour(), 300);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lgpd-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-scale-in"
      >
        {/* Cabeçalho navy */}
        <div className="flex items-center gap-3 bg-sidebar px-6 py-5">
          <Logo variant="mark" height={40} />
          <div>
            <h2
              id="lgpd-title"
              className="font-display text-lg font-bold text-white"
            >
              Bem-vindo ao NexaDrill
            </h2>
            <p className="text-sm text-sidebar-muted">
              Privacidade e proteção de dados
            </p>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-foreground">
              Você vai cadastrar dados pessoais dos seus clientes (nome,
              telefone, e-mail, CPF/CNPJ e endereço). Antes de continuar, veja
              como esses dados são tratados.
            </p>
          </div>

          <ul className="space-y-3">
            {PONTOS.map((p) => (
              <li key={p.texto} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                  <p.icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-muted-foreground">{p.texto}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/dashboard/termos"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Ler os Termos de Uso e a Política de Privacidade completos
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Rodapé / aceite */}
        <div className="space-y-3 border-t border-border px-6 py-4">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              Li e concordo com os{" "}
              <Link
                href="/dashboard/termos"
                target="_blank"
                className="font-medium text-primary hover:underline"
              >
                Termos de Uso e a Política de Privacidade
              </Link>
              .
            </span>
          </label>
          <Button className="w-full" onClick={aceitar} disabled={!aceito}>
            Aceitar e continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
