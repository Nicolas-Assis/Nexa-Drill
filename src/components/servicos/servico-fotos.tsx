"use client";

import { useRef, useState } from "react";
import { Plus, Loader2, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  uploadServicoFoto,
  addServicoFoto,
  removeServicoFoto,
} from "@/app/dashboard/servicos/actions";

interface ServicoFotosProps {
  servicoId: string;
  fotos: string[];
  /** Chamado após adicionar/remover uma foto (para recarregar os dados). */
  onChanged: () => void;
  /** Texto do estado vazio. */
  emptyHint?: string;
  /** Layout compacto (para listas/portfólio). */
  compact?: boolean;
}

/**
 * Gerenciador de fotos de um serviço (upload + galeria + remoção).
 * Reutilizado no detalhe do serviço e na área de Portfólio (Meu Perfil).
 */
export function ServicoFotos({
  servicoId,
  fotos,
  onChanged,
  emptyHint = "Adicione fotos para exibir no seu portfólio público",
  compact = false,
}: ServicoFotosProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const uploadResult = await uploadServicoFoto(servicoId, formData);
    if (uploadResult.error || !uploadResult.url) {
      toast.error(uploadResult.error ?? "Erro ao fazer upload da imagem.");
      setUploading(false);
      return;
    }

    const result = await addServicoFoto(servicoId, uploadResult.url);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Foto adicionada!");
    onChanged();
  }

  async function handleDelete(fotoUrl: string) {
    setDeleting(fotoUrl);
    const result = await removeServicoFoto(servicoId, fotoUrl);
    setDeleting(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Foto removida!");
    onChanged();
  }

  const thumbClass = compact ? "h-24" : "h-32";
  const gridClass = compact
    ? "grid-cols-3 sm:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}
          Adicionar foto
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Upload de foto do serviço"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {fotos.length > 0 ? (
        <div className={`grid gap-3 ${gridClass}`}>
          {fotos.map((foto, index) => (
            <div key={index} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto}
                alt={`Foto ${index + 1}`}
                className={`w-full ${thumbClass} rounded-lg border border-border object-cover`}
              />
              <Button
                variant="danger"
                size="sm"
                className="absolute right-2 top-2 h-8 w-8 p-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                onClick={() => handleDelete(foto)}
                disabled={deleting === foto}
              >
                {deleting === foto ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-muted-foreground">
          <ImageIcon className="mb-2 h-8 w-8" />
          <p className="text-xs">{emptyHint}</p>
        </div>
      )}
    </div>
  );
}
