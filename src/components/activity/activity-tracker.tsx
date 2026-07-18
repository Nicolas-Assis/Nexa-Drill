"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Envia heartbeats de atividade enquanto a aba está visível e a cada troca de
// rota. O servidor (/api/activity/heartbeat) acumula o tempo de permanência.
const INTERVAL_MS = 60_000;

export function ActivityTracker() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  function send(path?: string) {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    try {
      fetch("/api/activity/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path ?? pathRef.current }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // silencioso — rastreamento nunca deve quebrar a navegação
    }
  }

  // Intervalo + reativação ao voltar o foco / visibilidade.
  useEffect(() => {
    const id = window.setInterval(() => send(), INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") send();
    };
    const onFocus = () => send();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Troca de rota → atualiza a ref e registra pageview imediatamente.
  useEffect(() => {
    pathRef.current = pathname;
    send(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
