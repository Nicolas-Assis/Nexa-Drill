"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { usePerfurador } from "@/hooks/use-perfurador";
import { ONBOARDING_EVENT, type OnboardingAction } from "@/lib/onboarding";

const TOUR_VERSION = "v1";
const tourKey = (id: string) => `nexadrill:tour:${TOUR_VERSION}:${id}`;
const consentKey = (id: string) => `nexadrill:consent:v1:${id}`;

type Step = {
  target?: string; // seletor [data-tour]; ausente = card centralizado
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    title: "Bem-vindo ao NexaDrill! 👋",
    body: "Vou te mostrar rapidinho onde fica cada coisa. Você pode pular quando quiser.",
  },
  {
    target: '[data-tour="primeiros-passos"]',
    title: "Comece por aqui",
    body: "Este checklist marca sozinho conforme você configura seu negócio. Siga os passos na ordem.",
  },
  {
    target: '[data-tour="nav-clientes"]',
    title: "Clientes",
    body: "Cadastre e gerencie seus clientes — eles são a base dos orçamentos e cobranças.",
  },
  {
    target: '[data-tour="nav-orcamentos"]',
    title: "Orçamentos",
    body: "Monte orçamentos com itens, envie por link ou PDF e acompanhe pelo quadro. Ao aprovar, vira serviço.",
  },
  {
    target: '[data-tour="nav-servicos"]',
    title: "Serviços",
    body: "Acompanhe a execução dos poços, registre dados técnicos e fotos do trabalho.",
  },
  {
    target: '[data-tour="nav-receber"]',
    title: "Contas a Receber",
    body: "Gere cobranças por Pix, acompanhe parcelas (com sinal) e dê baixa nos recebimentos.",
  },
  {
    target: '[data-tour="nav-financeiro"]',
    title: "Financeiro",
    body: "Veja receitas, despesas, lucro e a margem por poço nos relatórios.",
  },
  {
    target: '[data-tour="nav-perfil"]',
    title: "Meu Perfil",
    body: "Configure seu perfil público e o portfólio de fotos que aparece no seu link para clientes.",
  },
  {
    target: '[data-tour="user-menu"]',
    title: "Ajuda sempre à mão",
    body: "Por aqui você pode refazer este tour ou rever os primeiros passos quando quiser.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8;
const TOOLTIP_W = 320;

export function WelcomeTour() {
  const { perfurador } = usePerfurador();
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = STEPS[i];

  const recompute = useCallback(() => {
    const sel = STEPS[i]?.target;
    if (!sel) {
      setRect(null);
      return;
    }
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      setRect(null);
      return;
    }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [i]);

  // Recalcula ao trocar de passo (com scroll até o alvo) + em resize/scroll
  useEffect(() => {
    if (!active) return;
    const sel = STEPS[i]?.target;
    if (sel) {
      const el = document.querySelector(sel) as HTMLElement | null;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    recompute();
    const t = window.setTimeout(recompute, 350);
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [active, i, recompute]);

  const start = useCallback(() => {
    setI(0);
    setActive(true);
  }, []);

  const finish = useCallback(() => {
    setActive(false);
    if (perfurador?.id) {
      try {
        window.localStorage.setItem(
          tourKey(perfurador.id),
          new Date().toISOString(),
        );
      } catch {
        /* ignora */
      }
    }
  }, [perfurador?.id]);

  // Auto-início no primeiro acesso (após o consentimento LGPD) + ?tour=1
  useEffect(() => {
    if (!perfurador?.id) return;
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("tour") === "1") {
        start();
        return;
      }
      const consentiu = window.localStorage.getItem(consentKey(perfurador.id));
      const jaViu = window.localStorage.getItem(tourKey(perfurador.id));
      if (consentiu && !jaViu) start();
    } catch {
      /* ignora */
    }
  }, [perfurador?.id, start]);

  // Reabrir via evento (menu do usuário / aceite do LGPD)
  useEffect(() => {
    function onEvent(e: Event) {
      const action = (e as CustomEvent<{ action: OnboardingAction }>).detail
        ?.action;
      if (action === "tour") start();
    }
    window.addEventListener(ONBOARDING_EVENT, onEvent);
    return () => window.removeEventListener(ONBOARDING_EVENT, onEvent);
  }, [start]);

  // Trava scroll do body enquanto ativo
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);

  if (!active || !step) return null;

  const isFirst = i === 0;
  const isLast = i === STEPS.length - 1;

  // Posição do tooltip
  let tooltipStyle: React.CSSProperties;
  if (rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const below = rect.top + rect.height + 12;
    const showBelow = below + 200 < vh;
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, vw - TOOLTIP_W - 12),
    );
    tooltipStyle = showBelow
      ? { top: below, left }
      : { top: rect.top - 12, left, transform: "translateY(-100%)" };
  } else {
    tooltipStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Bloqueador de cliques na página */}
      <div
        className={rect ? "absolute inset-0" : "absolute inset-0 bg-slate-900/60"}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight sobre o alvo (o próprio box-shadow escurece o resto) */}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card p-5 shadow-xl animate-scale-in"
        style={tooltipStyle}
      >
        <button
          onClick={finish}
          aria-label="Fechar tour"
          className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {isFirst && (
          <div className="mb-3">
            <Logo variant="mark" height={40} />
          </div>
        )}

        <h3 className="font-display text-base font-bold text-foreground">
          {step.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        {/* Progresso */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={
                idx === i
                  ? "h-1.5 w-4 rounded-full bg-primary transition-all"
                  : "h-1.5 w-1.5 rounded-full bg-muted transition-all"
              }
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={finish}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Pular
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setI((v) => Math.max(0, v - 1))}
              >
                Voltar
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish}>
                Concluir
              </Button>
            ) : (
              <Button size="sm" onClick={() => setI((v) => v + 1)}>
                Próximo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
