"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  X,
  UserCircle,
  Users,
  FileText,
  Wrench,
  Wallet,
  ArrowRight,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePerfurador } from "@/hooks/use-perfurador";
import { getPrimeirosPassos, type PrimeirosPassos as Passos } from "@/app/dashboard/actions";
import { ONBOARDING_EVENT, type OnboardingAction } from "@/lib/onboarding";

const STORAGE_VERSION = "v1";
const storageKey = (id: string) => `nexadrill:primeiros-passos:${STORAGE_VERSION}:${id}`;

type Etapa = {
  key: keyof Passos;
  label: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
};

const ETAPAS: Etapa[] = [
  {
    key: "perfilCompleto",
    label: "Complete seu perfil público",
    descricao: "Logo, bio, link e áreas de atuação",
    href: "/dashboard/perfil",
    icon: UserCircle,
  },
  {
    key: "temCliente",
    label: "Cadastre seu primeiro cliente",
    descricao: "Dados de contato para orçamentos e cobranças",
    href: "/dashboard/clientes",
    icon: Users,
  },
  {
    key: "temOrcamento",
    label: "Crie um orçamento",
    descricao: "Monte itens e envie por link ou PDF",
    href: "/dashboard/orcamentos/novo",
    icon: FileText,
  },
  {
    key: "temServico",
    label: "Registre um serviço",
    descricao: "Acompanhe a execução do poço",
    href: "/dashboard/servicos",
    icon: Wrench,
  },
  {
    key: "temCobranca",
    label: "Gere uma cobrança",
    descricao: "Receba por Pix e dê baixa nas parcelas",
    href: "/dashboard/receber",
    icon: Wallet,
  },
];

export function PrimeirosPassos() {
  const { perfurador } = usePerfurador();
  const [passos, setPassos] = useState<Passos | null>(null);
  const [dismissed, setDismissed] = useState(true); // começa oculto até saber
  const [forceShow, setForceShow] = useState(false);

  const load = useCallback(async () => {
    const res = await getPrimeirosPassos();
    if (!res.error) setPassos(res.passos);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Estado de "dispensado" por conta + reabertura via query (?guia=1)
  useEffect(() => {
    if (!perfurador?.id) return;
    try {
      const done = window.localStorage.getItem(storageKey(perfurador.id));
      setDismissed(Boolean(done));
    } catch {
      setDismissed(false);
    }
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search);
      if (q.get("guia") === "1") setForceShow(true);
    }
  }, [perfurador?.id]);

  // Reabertura via evento (menu do usuário)
  useEffect(() => {
    function onEvent(e: Event) {
      const action = (e as CustomEvent<{ action: OnboardingAction }>).detail
        ?.action;
      if (action === "primeiros-passos") {
        setForceShow(true);
        load();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    window.addEventListener(ONBOARDING_EVENT, onEvent);
    return () => window.removeEventListener(ONBOARDING_EVENT, onEvent);
  }, [load]);

  function dispensar() {
    if (perfurador?.id) {
      try {
        window.localStorage.setItem(storageKey(perfurador.id), "dismissed");
      } catch {
        /* ignora */
      }
    }
    setDismissed(true);
    setForceShow(false);
  }

  if (!passos) return null;

  const total = ETAPAS.length;
  const feitos = ETAPAS.filter((et) => passos[et.key]).length;
  const tudoPronto = feitos === total;

  // Regra de exibição: aparece quando reaberto, ou quando não dispensado e ainda incompleto
  const visivel = forceShow || (!dismissed && !tudoPronto);
  if (!visivel) return null;

  const pct = Math.round((feitos / total) * 100);

  return (
    <Card data-tour="primeiros-passos" className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-primary-900 to-primary-700 px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="font-display text-base font-bold">
            {tudoPronto ? "Tudo pronto! 🎉" : "Comece por aqui"}
          </p>
          <p className="text-sm text-primary-100">
            {tudoPronto
              ? "Você configurou o essencial do NexaDrill."
              : "Siga os passos para configurar seu negócio no NexaDrill."}
          </p>
        </div>
        <button
          onClick={dispensar}
          aria-label="Dispensar"
          className="rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <CardContent className="p-5">
        {/* Progresso */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-sm font-semibold text-muted-foreground">
            {feitos}/{total}
          </span>
        </div>

        {tudoPronto ? (
          <div className="flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">
            <PartyPopper className="h-5 w-5 shrink-0" />
            Parabéns! Todos os primeiros passos foram concluídos.
          </div>
        ) : (
          <ul className="space-y-1">
            {ETAPAS.map((et) => {
              const done = passos[et.key];
              const Icon = et.icon;
              return (
                <li key={et.key}>
                  <Link
                    href={et.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                      done ? "opacity-60" : "hover:bg-muted",
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm font-medium text-foreground",
                          done && "line-through",
                        )}
                      >
                        {et.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {et.descricao}
                      </span>
                    </span>
                    {!done && (
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
