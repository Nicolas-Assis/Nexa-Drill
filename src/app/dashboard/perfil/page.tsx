"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Image from "next/image";
import { Loader2, Camera, ExternalLink, Check } from "lucide-react";
import { perfilSchema, PerfilFormData } from "@/lib/validations";
import { updatePerfurador, getPerfuradorPerfil, uploadLogo } from "./actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ESTADOS_BRASILEIROS,
  TIPOS_SERVICO_OPTIONS,
  TIPOS_SOLO_OPTIONS,
} from "@/lib/constants";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nexadrill.com.br";

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      tipos_servico: [],
      tipos_solo_experiencia: [],
      raio_atendimento_km: 100,
    },
  });

  const tiposServico = watch("tipos_servico") ?? [];
  const tiposSolo = watch("tipos_solo_experiencia") ?? [];
  const slugValue = watch("slug") ?? "";
  const bioValue = watch("bio") ?? "";

  function toggleTipoServico(val: string) {
    if (tiposServico.includes(val)) {
      setValue(
        "tipos_servico",
        tiposServico.filter((t) => t !== val),
      );
    } else {
      setValue("tipos_servico", [...tiposServico, val]);
    }
  }

  function toggleTipoSolo(val: string) {
    if (tiposSolo.includes(val)) {
      setValue(
        "tipos_solo_experiencia",
        tiposSolo.filter((t) => t !== val),
      );
    } else {
      setValue("tipos_solo_experiencia", [...tiposSolo, val]);
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getPerfuradorPerfil();
    if (result.error || !result.perfurador) {
      toast.error(result.error ?? "Erro ao carregar perfil");
      setLoading(false);
      return;
    }
    const p = result.perfurador;
    setLogoPreview(p.logo_url);
    reset({
      nome: p.nome ?? "",
      telefone: p.telefone ?? "",
      nome_empresa: p.nome_empresa ?? "",
      bio: p.bio ?? "",
      cidade: p.cidade ?? "",
      estado: p.estado ?? "",
      slug: p.slug ?? "",
      logo_url: p.logo_url ?? "",
      raio_atendimento_km: p.raio_atendimento_km ?? 100,
      profundidade_max_metros: p.profundidade_max_metros ?? undefined,
      tipos_servico: p.tipos_servico ?? [],
      tipos_solo_experiencia: p.tipos_solo_experiencia ?? [],
    });
    setLoading(false);
  }, [reset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadLogo(formData);

    if (result.error || !result.url) {
      toast.error(`Erro ao fazer upload: ${result.error}`);
      setUploading(false);
      return;
    }

    setValue("logo_url", result.url);
    setLogoPreview(result.url);
    setUploading(false);
    toast.success("Logo atualizada!");
  }

  async function onSubmit(data: PerfilFormData) {
    const result = await updatePerfurador(data);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Perfil atualizado com sucesso!");
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const publicProfileUrl = slugValue ? `${APP_URL}/perfil/${slugValue}` : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Meu Perfil</h1>
          <p className="text-secondary-500 mt-1">
            Configure seu perfil público e informações da empresa
          </p>
        </div>
        {publicProfileUrl && (
          <a
            href={publicProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ver perfil público
          </a>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo / Foto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div
                className="relative h-24 w-24 rounded-xl border-2 border-dashed border-secondary-200 bg-secondary-50 overflow-hidden cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Logo"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                    <Camera className="h-6 w-6 text-secondary-400" />
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Enviando..." : "Alterar logo"}
                </Button>
                <p className="text-xs text-secondary-400 mt-1.5">
                  PNG, JPG até 2MB. Recomendado: 400×400px.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Upload de logo"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </CardContent>
        </Card>

        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome completo"
                {...register("nome")}
                error={errors.nome?.message}
              />
              <Input
                label="Nome da empresa"
                {...register("nome_empresa")}
                error={errors.nome_empresa?.message}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Telefone / WhatsApp"
                placeholder="(00) 00000-0000"
                {...register("telefone")}
                error={errors.telefone?.message}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Cidade"
                  {...register("cidade")}
                  error={errors.cidade?.message}
                />
                <Select
                  label="Estado"
                  options={ESTADOS_BRASILEIROS.map((uf) => ({
                    value: uf,
                    label: uf,
                  }))}
                  placeholder="UF"
                  {...register("estado")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Public profile */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil Público</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bio */}
            <div>
              <Textarea
                label="Bio / Descrição"
                rows={4}
                maxLength={500}
                placeholder="Conte sobre sua experiência, quantos anos no mercado, diferenciais..."
                {...register("bio")}
                error={errors.bio?.message}
              />
              <p className="text-xs text-secondary-400 mt-1 text-right">
                {bioValue.length}/500 caracteres
              </p>
            </div>

            {/* Raio + Profundidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Raio de atendimento (km)"
                type="number"
                min={1}
                max={2000}
                {...register("raio_atendimento_km", { valueAsNumber: true })}
                error={errors.raio_atendimento_km?.message}
              />
              <Input
                label="Profundidade máxima (metros)"
                type="number"
                min={1}
                max={10000}
                placeholder="Ex: 300"
                {...register("profundidade_max_metros", {
                  valueAsNumber: true,
                })}
                error={errors.profundidade_max_metros?.message}
              />
            </div>

            {/* Tipos de serviço */}
            <div>
              <p className="text-sm font-medium text-secondary-700 mb-2">
                Tipos de serviço
              </p>
              <div className="flex flex-wrap gap-2">
                {TIPOS_SERVICO_OPTIONS.map((opt) => {
                  const active = tiposServico.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleTipoServico(opt.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary-50 text-primary"
                          : "border-secondary-200 bg-white text-secondary-600 hover:border-secondary-300",
                      )}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tipos de solo */}
            <div>
              <p className="text-sm font-medium text-secondary-700 mb-2">
                Tipos de solo com experiência
              </p>
              <div className="flex flex-wrap gap-2">
                {TIPOS_SOLO_OPTIONS.map((opt) => {
                  const active = tiposSolo.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleTipoSolo(opt.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "border-accent bg-accent-50 text-accent"
                          : "border-secondary-200 bg-white text-secondary-600 hover:border-secondary-300",
                      )}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slug */}
        <Card>
          <CardHeader>
            <CardTitle>Link Personalizado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              label="Slug (URL personalizada)"
              placeholder="ex: joao-perfuracoes"
              {...register("slug")}
              error={errors.slug?.message}
            />
            {slugValue && !errors.slug && (
              <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-sm">
                <span className="text-secondary-400">
                  Seu perfil ficará em:
                </span>
                <span className="font-medium text-primary break-all">
                  {APP_URL}/perfil/{slugValue}
                </span>
              </div>
            )}
            <p className="text-xs text-secondary-400">
              Use apenas letras minúsculas, números e hífens. Ex:
              joao-silva-perfuracoes
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
