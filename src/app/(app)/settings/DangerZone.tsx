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
    <div className="rounded-md border border-error/30 bg-error/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
        <div>
          <p className="text-sm font-medium text-text-primary">Delete account</p>
          <p className="mt-1 text-xs text-text-secondary">
            Permanently deletes your profile, business, revenue history and rankings. This cannot be undone.
          </p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setOpen(true)}>
            Delete my account
          </Button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete your account?">
        <p className="text-sm text-text-secondary">
          Type <span className="font-mono text-text-primary">DELETE</span> to confirm. This action is permanent.
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-3 w-full rounded-md border border-border-strong bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-error/50"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={confirmText !== "DELETE" || pending}
            onClick={confirmDelete}
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}
