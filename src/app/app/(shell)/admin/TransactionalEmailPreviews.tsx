"use client";

import { useState, useTransition } from "react";
import { Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { getTransactionalEmailPreviewAction, sendTransactionalEmailPreviewAction } from "./actions";
import type { TransactionalEmailPreview } from "@/lib/transactionalEmailPreviews";

export function TransactionalEmailPreviews({ items }: { items: TransactionalEmailPreview[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function openPreview(key: string) {
    setOpenKey(key);
    setLoading(true);
    setHtml("");
    startTransition(async () => {
      const result = await getTransactionalEmailPreviewAction(key);
      setLoading(false);
      if (!result.success) {
        toast.show(result.error, "error");
        setOpenKey(null);
        return;
      }
      setSubject(result.data.subject);
      setHtml(result.data.html);
    });
  }

  function sendTest(key: string) {
    startTransition(async () => {
      const result = await sendTransactionalEmailPreviewAction(key);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Email de test envoyé à ton adresse.", "success");
    });
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">{item.label}</p>
            <p className="truncate text-xs text-text-muted">{item.trigger}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => openPreview(item.key)}>
              <Eye className="h-3.5 w-3.5" /> Aperçu
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => sendTest(item.key)} disabled={pending}>
              <Send className="h-3.5 w-3.5" /> M&apos;envoyer un test
            </Button>
          </div>
        </div>
      ))}

      <Modal open={openKey !== null} onClose={() => setOpenKey(null)} title={subject || "Aperçu"} className="max-w-xl">
        {loading ? (
          <p className="py-8 text-center text-sm text-text-muted">Chargement...</p>
        ) : (
          <iframe
            title="Aperçu de l'email"
            srcDoc={html}
            className="h-[520px] w-full rounded-md border border-border bg-white"
            sandbox=""
          />
        )}
      </Modal>
    </div>
  );
}
