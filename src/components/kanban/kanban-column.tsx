"use client";

import { Droppable } from "@hello-pangea/dnd";
import { KanbanCard } from "./kanban-card";
import { Orcamento } from "@/types";

interface KanbanColumnProps {
  id: string;
  title: string;
  orcamentos: Orcamento[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function KanbanColumn({
  id,
  title,
  orcamentos,
  onEdit,
  onDelete,
}: KanbanColumnProps) {
  return (
    <div className="flex w-[80vw] sm:w-72 flex-shrink-0 flex-col rounded-xl bg-secondary-50 p-3 snap-center">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-secondary-700">{title}</h3>
        <span className="rounded-full bg-secondary-200 px-2 py-0.5 text-xs font-medium text-secondary-600">
          {orcamentos.length}
        </span>
      </div>
      <Droppable droppableId={id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-1 flex-col gap-2 min-h-[100px]"
          >
            {orcamentos.map((orcamento, index) => (
              <KanbanCard
                key={orcamento.id}
                orcamento={orcamento}
                index={index}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
