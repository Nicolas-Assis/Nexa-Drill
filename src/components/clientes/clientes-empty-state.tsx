import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientesEmptyStateProps {
  onAdd: () => void;
}

export function ClientesEmptyState({ onAdd }: ClientesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-secondary-300 bg-white px-6 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100">
        <Users className="h-8 w-8 text-secondary-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-secondary-900">
        Nenhum cliente cadastrado
      </h3>
      <p className="mt-1 text-sm text-secondary-500 text-center max-w-sm">
        Adicione seu primeiro cliente para começar a criar orçamentos e gerenciar serviços.
      </p>
      <Button className="mt-6" onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Cliente
      </Button>
    </div>
  );
}
