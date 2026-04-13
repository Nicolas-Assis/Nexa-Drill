"use client";

import { useEffect, useState, useCallback } from "react";
import { getPerfuradorData } from "@/app/dashboard/orcamentos/actions";
import type { Perfurador } from "@/types";

export function usePerfurador() {
  const [perfurador, setPerfurador] = useState<Perfurador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerfurador = useCallback(async () => {
    try {
      setError(null);
      const { perfurador: data, error: err } = await getPerfuradorData();
      if (err) {
        setError(err);
        return;
      }
      setPerfurador(data as Perfurador);
    } catch (e) {
      setError("Erro ao buscar dados do perfurador");
      console.error("Erro ao buscar perfurador:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerfurador();
  }, [fetchPerfurador]);

  return { perfurador, loading, error, refetch: fetchPerfurador };
}
