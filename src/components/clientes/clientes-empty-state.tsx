import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface ClientesEmptyStateProps {
  onAdd: () => void;
}

export function ClientesEmptyState({ onAdd }: ClientesEmptyStateProps) {
  return (
    <EmptyState
      icon={Users}
      title="Nenhum cliente cadastrado"
      description="Adicione seu primeiro cliente para começar a criar orçamentos e gerenciar serviços."
      action={
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      }
    />
  );
}
