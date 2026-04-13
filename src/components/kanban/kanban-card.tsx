"use client";

import Link from "next/link";
import { Draggable } from "@hello-pangea/dnd";
import { Pencil, Trash2, MoreVertical } from "lucide-react";
import { Orcamento } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

interface KanbanCardProps {
  orcamento: Orcamento;
  index: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function KanbanCard({
  orcamento,
  index,
  onEdit,
  onDelete,
}: KanbanCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Draggable draggableId={orcamento.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="rounded-lg border border-secondary-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
        >
          <Link href={`/dashboard/orcamentos/${orcamento.id}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-secondary-500">
                {orcamento.tipo_servico || "Orçamento"}
              </span>
            </div>
            <p className="text-sm font-medium text-secondary-900 mb-1">
              {orcamento.cliente?.nome || "Cliente"}
            </p>
            <p className="text-sm font-semibold text-primary">
              {formatCurrency(
                orcamento.valor_final ?? orcamento.valor_total ?? 0,
              )}
            </p>
          </Link>

          {/* Quick actions menu */}
          <div className="absolute top-2 right-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary-100 transition-all"
            >
              <MoreVertical className="h-4 w-4 text-secondary-400" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-6 z-20 bg-white border border-secondary-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit?.(orcamento.id);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-secondary-700 hover:bg-secondary-50 flex items-center gap-2"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete?.(orcamento.id);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-danger-50 flex items-center gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
