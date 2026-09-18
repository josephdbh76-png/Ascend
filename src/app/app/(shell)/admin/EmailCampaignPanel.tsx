"use client";

import { useEffect, useState, useTransition } from "react";
import { Send, Eye, AlertTriangle, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { timeAgo } from "@/lib/utils";
import {
  getAudienceCountAction,
  sendCampaignPreviewAction,
  sendCampaignAction,
  saveEmailTemplateAction,
  deleteEmailTemplateAction,
} from "./actions";
import {
  AUDIENCE_LABELS,
  STARTER_TEMPLATES,
  type CampaignAudience,
  type CampaignHistoryRow,
  type EmailTemplateRow,
} from "@/lib/emailCampaignDisplay";

const AUDIENCES = Object.keys(AUDIENCE_LABELS) as CampaignAudience[];
const STARTER_IDS = new Set(STARTER_TEMPLATES.map((t) => t.id));

export function EmailCampaignPanel({ history, templates }: { history: CampaignHistoryRow[]; templates: EmailTemplateRow[] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<CampaignAudience>("all");
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState(templates);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    async function loadCount() {
      setCountLoading(true);
      const result = await getAudienceCountAction(audience);
      if (cancelled) return;
      setCount(result.success ? result.data : null);
      setCountLoading(false);
    }
    loadCount();
    return () => {
      cancelled = true;
    };
  }, [audience]);

  function applyTemplate(id: string) {
    setSelectedTemplateId(id);
    const template = [...STARTER_TEMPLATES, ...savedTemplates].find((t) => t.id === id);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  }

  function sendPreview() {
    startTransition(async () => {
      const result = await sendCampaignPreviewAction(subject, body);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Aperçu envoyé à ton adresse email.", "success");
    });
  }

  function send() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await sendCampaignAction(subject, body, audience);
      setConfirming(false);
      if (!result.success) return toast.show(result.error, "error");
      toast.show(`Campagne envoyée à ${result.data.recipientCount} destinataire${result.data.recipientCount > 1 ? "s" : ""}.`, "success");
      setSubject("");
      setBody("");
      setSelectedTemplateId("");
    });
  }

  function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveEmailTemplateAction(templateName, subject, body);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Modèle enregistré.", "success");
      setSaveModalOpen(false);
      setTemplateName("");
      // Re-synced from the server on next full page load; a locally
      // constructed row keeps the picker usable immediately in the meantime.
      setSavedTemplates((prev) => [{ id: crypto.randomUUID(), name: templateName, subject, body }, ...prev]);
    });
  }

  function deleteTemplate(id: string) {
    startTransition(async () => {
      const result = await deleteEmailTemplateAction(id);
      if (!result.success) return toast.show(result.error, "error");
      setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedTemplateId === id) setSelectedTemplateId("");
      toast.show("Modèle supprimé.", "success");
    });
  }

  const canSend = subject.trim().length > 0 && body.trim().length > 0;
  const selectedIsSaved = selectedTemplateId && !STARTER_IDS.has(selectedTemplateId);

  return (
    <div className="flex flex-col gap-5">
      <Field label="Modèle" hint="Charge un point de départ, modifie-le librement, puis envoie ou enregistre tes propres modèles.">
        <div className="flex items-center gap-2">
          <Select value={selectedTemplateId} onChange={(e) => applyTemplate(e.target.value)} className="flex-1">
            <option value="">Partir de zéro</option>
            <optgroup label="Modèles de départ">
              {STARTER_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            {savedTemplates.length > 0 && (
              <optgroup label="Mes modèles">
                {savedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
          {selectedIsSaved && (
            <button
              type="button"
              onClick={() => deleteTemplate(selectedTemplateId)}
              aria-label="Supprimer ce modèle"
              className="shrink-0 rounded-md border border-border-strong p-2.5 text-text-muted hover:text-error"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </Field>

      <Field label="Sujet">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Un titre récompensé à 100 000 € vient d'être obtenu 👑" />
      </Field>
      <Field label="Message" hint="Texte brut — les sauts de ligne sont conservés, le lien de désinscription est ajouté automatiquement.">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Bonjour,&#10;&#10;..." />
      </Field>
      <Field label="Audience">
        <Select value={audience} onChange={(e) => setAudience(e.target.value as CampaignAudience)}>
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {AUDIENCE_LABELS[a]}
            </option>
          ))}
        </Select>
      </Field>
      <p className="text-xs text-text-muted">
        {countLoading ? "Calcul de l'audience..." : count != null ? `${count} destinataire${count > 1 ? "s" : ""} recevront cet email.` : ""}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={sendPreview} disabled={pending || !canSend}>
          <Eye className="h-3.5 w-3.5" /> Envoyer un aperçu à moi-même
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setSaveModalOpen(true)} disabled={pending || !canSend}>
          <Save className="h-3.5 w-3.5" /> Enregistrer comme modèle
        </Button>
        <Button
          type="button"
          variant={confirming ? "danger" : "primary"}
          size="sm"
          onClick={send}
          disabled={pending || !canSend || count === 0}
        >
          <Send className="h-3.5 w-3.5" />
          {confirming ? `Confirmer l'envoi à ${count ?? 0} destinataire${(count ?? 0) > 1 ? "s" : ""}` : "Envoyer la campagne"}
        </Button>
        {confirming && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
            Annuler
          </Button>
        )}
      </div>
      {confirming && (
        <p className="flex items-center gap-1.5 text-xs text-error">
          <AlertTriangle className="h-3.5 w-3.5" /> Cet envoi est immédiat et irréversible.
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Historique</span>
          {history.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 text-xs text-text-secondary">
              <span className="truncate">{c.subject}</span>
              <span className="shrink-0 text-text-muted">
                {c.recipientCount} destinataire{c.recipientCount > 1 ? "s" : ""} · {timeAgo(c.sentAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Enregistrer comme modèle">
        <form onSubmit={saveTemplate} className="flex flex-col gap-4">
          <Field label="Nom du modèle">
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Ex. Annonce trimestrielle" required autoFocus />
          </Field>
          <Button type="submit" disabled={pending || !templateName.trim()} className="self-start">
            Enregistrer
          </Button>
        </form>
      </Modal>
    </div>
  );
}
