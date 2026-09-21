"use client";

import { useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { exportMyDataAction } from "./actions";

export function ExportDataButton() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function exportData() {
    startTransition(async () => {
      const result = await exportMyDataAction();
      if (!result.success) return toast.show(result.error, "error");

      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ascend-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.show("Export téléchargé.", "success");
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-border-strong bg-card p-4">
      <Download className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
      <div>
        <p className="text-sm font-medium text-text-primary">Exporter mes données</p>
        <p className="mt-1 text-xs text-text-secondary">
          Télécharge un fichier JSON avec ton profil, ton activité, tes revenus, tes accomplissements et
          titres — ton droit à la portabilité, en un clic.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={exportData} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Télécharger mes données
        </Button>
      </div>
    </div>
  );
}
