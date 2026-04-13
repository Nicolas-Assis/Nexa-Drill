"use client";

import { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./kanban-column";
import { KANBAN_COLUMNS } from "@/lib/constants";
import { Orcamento, StatusOrcamento } from "@/types";

interface KanbanBoardProps {
  orcamentos: Orcamento[];
  onStatusChange?: (orcamentoId: string, newStatus: StatusOrcamento) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function KanbanBoard({
  orcamentos,
  onStatusChange,
  onEdit,
  onDelete,
}: KanbanBoardProps) {
  const [items, setItems] = useState(orcamentos);

  useEffect(() => {
    setItems(orcamentos);
  }, [orcamentos]);

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as StatusOrcamento;

    setItems((prev) =>
      prev.map((item) =>
        item.id === draggableId ? { ...item, status: newStatus } : item,
      ),
    );

    onStatusChange?.(draggableId, newStatus);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            orcamentos={items.filter((o) => o.status === column.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
