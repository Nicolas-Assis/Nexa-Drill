"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  clienteNome: string;
  loading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  clienteNome,
  loading,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-danger" />
          Excluir Cliente
        </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-secondary-600 mt-2">
        Tem certeza que deseja excluir o cliente{" "}
        <span className="font-semibold text-secondary-900">{clienteNome}</span>?
        Esta ação não pode ser desfeita.
      </p>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Excluindo...
            </>
          ) : (
            "Excluir"
          )}
        </Button>
      </div>
    </Dialog>
  );
}
