"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, Phone, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { Cliente } from "@/types";

interface ClienteCardProps {
  cliente: Cliente & { _orcamentosCount: number };
  onEdit: (cliente: Cliente) => void;
  onDelete: (cliente: Cliente) => void;
}

export function ClienteCard({ cliente, onEdit, onDelete }: ClienteCardProps) {
  const location = [cliente.cidade, cliente.estado].filter(Boolean).join(" / ");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/clientes/${cliente.id}`}
              className="text-sm font-semibold text-secondary-900 hover:text-primary transition-colors"
            >
              {cliente.nome}
            </Link>
            <div className="mt-1.5 space-y-1">
              <a
                href={`tel:${cliente.telefone}`}
                className="flex items-center gap-1.5 text-sm text-secondary-500 hover:text-primary transition-colors"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {cliente.telefone}
              </a>
              {location && (
                <p className="flex items-center gap-1.5 text-sm text-secondary-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {location}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu
            trigger={
              <button className="rounded-lg p-1.5 text-secondary-400 hover:bg-secondary-50 hover:text-secondary-600">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
          >
            <DropdownMenuItem onClick={() => onEdit(cliente)}>
              <Pencil className="mr-2 h-4 w-4 text-secondary-400" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(cliente)}
              className="text-danger hover:bg-danger-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge variant={cliente._orcamentosCount > 0 ? "info" : "default"}>
            {cliente._orcamentosCount} orçamento{cliente._orcamentosCount !== 1 ? "s" : ""}
          </Badge>
          <span className="text-xs text-secondary-400">
            {formatDate(cliente.created_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
