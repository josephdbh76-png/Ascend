"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { deleteAccountAction } from "./actions";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteAccountAction();
      if (result && !result.success) toast.show(result.error, "error");
    });
  }

  return (
    <div className="border border-error/30 bg-error/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
        <div>
          <p className="text-sm font-medium text-text-primary">Supprimer le compte</p>
          <p className="mt-1 text-xs text-text-secondary">
            Supprime définitivement ton profil, ton activité, ton historique de revenus et ton classement.
            Cette action est irréversible.
          </p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setOpen(true)}>
            Supprimer mon compte
          </Button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Supprimer ton compte ?">
        <p className="text-sm text-text-secondary">
          Tape <span className="font-mono text-text-primary">SUPPRIMER</span> pour confirmer. Cette action est
          définitive.
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-3 w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-error/50"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={confirmText !== "SUPPRIMER" || pending}
            onClick={confirmDelete}
          >
            Supprimer définitivement
          </Button>
        </div>
      </Modal>
    </div>
  );
}
