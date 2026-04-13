"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, Phone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { Cliente } from "@/types";

interface ClientesTableProps {
  clientes: (Cliente & { _orcamentosCount: number })[];
  onEdit: (cliente: Cliente) => void;
  onDelete: (cliente: Cliente) => void;
}

export function ClientesTable({ clientes, onEdit, onDelete }: ClientesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Cidade/Estado</TableHead>
          <TableHead className="text-center">Orçamentos</TableHead>
          <TableHead>Cadastro</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.map((cliente) => (
          <TableRow key={cliente.id}>
            <TableCell>
              <Link
                href={`/dashboard/clientes/${cliente.id}`}
                className="font-medium text-secondary-900 hover:text-primary transition-colors"
              >
                {cliente.nome}
              </Link>
            </TableCell>
            <TableCell>
              <a
                href={`tel:${cliente.telefone}`}
                className="inline-flex items-center gap-1.5 text-secondary-600 hover:text-primary transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                {cliente.telefone}
              </a>
            </TableCell>
            <TableCell>
              {cliente.cidade || cliente.estado ? (
                <span className="text-secondary-600">
                  {[cliente.cidade, cliente.estado].filter(Boolean).join(" / ")}
                </span>
              ) : (
                <span className="text-secondary-400">—</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              <Badge variant={cliente._orcamentosCount > 0 ? "info" : "default"}>
                {cliente._orcamentosCount}
              </Badge>
            </TableCell>
            <TableCell className="text-secondary-500 text-sm">
              {formatDate(cliente.created_at)}
            </TableCell>
            <TableCell>
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
