"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Send, Eye, AlertTriangle, Save, Trash2, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn, timeAgo } from "@/lib/utils";
import { personalize, renderEmailHtml } from "@/lib/emailRender";
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
  unfilledPlaceholders,
  type CampaignAudience,
  type CampaignHistoryRow,
  type EmailTemplateRow,
} from "@/lib/emailCampaignDisplay";

const AUDIENCES = Object.keys(AUDIENCE_LABELS) as CampaignAudience[];
const STARTER_IDS = new Set(STARTER_TEMPLATES.map((t) => t.id));
const SAMPLE_FIRST_NAME = "Camille";

const MARKUP_HELP: [string, string][] = [
  ["Ligne vide", "nouveau paragraphe"],
  ["## Titre", "titre de section"],
  ["- élément", "liste à puces"],
  ["> ASCEND15", "encadré doré (code, chiffre, citation)"],
  ["[Texte](/app/titles)", "seul dans son paragraphe : un bouton ; dans une phrase : un lien"],
  ["**mots**", "en gras"],
  ["{prénom}", "le prénom du destinataire"],
];

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
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
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

  const selectedStarter = STARTER_TEMPLATES.find((t) => t.id === selectedTemplateId);
  const unfilled = unfilledPlaceholders(`${subject}\n${body}`);
  // Exactly the HTML a member receives, with a sample first name.
  const previewHtml = useMemo(
    () => (body.trim() ? renderEmailHtml(personalize(body, SAMPLE_FIRST_NAME), { unsubscribeUrl: "#" }) : ""),
    [body],
  );

  function applyTemplate(id: string) {
    setSelectedTemplateId(id);
    setConfirming(false);
    const template = [...STARTER_TEMPLATES, ...savedTemplates].find((t) => t.id === id);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      if (template.audience) setAudience(template.audience);
    }
  }

  function sendPreview() {
    startTransition(async () => {
      const result = await sendCampaignPreviewAction(subject, body);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Aperçu envoyé à ton adresse e-mail.", "success");
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
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Editor */}
        <div className="flex min-w-0 flex-col gap-5">
          <Field label="Modèle" hint="Charge un point de départ, complète les [crochets], puis envoie ou enregistre tes propres modèles.">
            <div className="flex items-center gap-2">
              <Select value={selectedTemplateId} onChange={(e) => applyTemplate(e.target.value)} className="flex-1">
                <option value="">Partir de zéro</option>
                <optgroup label="Modèles ASCEND">
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
          {selectedStarter?.when && (
            <p className="-mt-3 rounded-md border border-border bg-card px-3 py-2 text-xs text-text-secondary">
              <span className="font-medium text-text-primary">Quand l&apos;envoyer : </span>
              {selectedStarter.when}
            </p>
          )}

          <Field label="Sujet" hint="{prénom} est remplacé par le prénom de chaque destinataire.">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ce mois-ci sur ASCEND" />
          </Field>
          <Field label="Message">
            <Textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setConfirming(false);
              }}
              rows={16}
              placeholder={"Salut {prénom},\n\n..."}
              className="font-mono text-[13px] leading-relaxed sm:text-[13px]"
            />
          </Field>
          <details className="-mt-3 rounded-md border border-border bg-card px-3 py-2 text-xs text-text-secondary">
            <summary className="cursor-pointer font-medium text-text-primary">Mise en forme</summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              {MARKUP_HELP.map(([code, meaning]) => (
                <div key={code} className="contents">
                  <dt>
                    <code className="rounded bg-card-elevated px-1.5 py-0.5 text-text-primary">{code}</code>
                  </dt>
                  <dd>{meaning}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-text-muted">Le lien de désinscription et la signature sont ajoutés automatiquement.</p>
          </details>

          <Field label="Audience">
            <Select value={audience} onChange={(e) => setAudience(e.target.value as CampaignAudience)}>
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE_LABELS[a]}
                </option>
              ))}
            </Select>
          </Field>
          <p className="-mt-3 text-xs text-text-muted">
            {countLoading
              ? "Calcul de l'audience..."
              : count === 0
                ? "Aucun destinataire pour cette audience."
                : count != null
                  ? `${count} destinataire${count > 1 ? "s recevront" : " recevra"} cet e-mail.`
                  : ""}
          </p>

          {unfilled.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-text-secondary">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-gold" />
              <span>
                À compléter avant l&apos;envoi : <span className="font-medium text-text-primary">{unfilled.join(", ")}</span>
              </span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={sendPreview} disabled={pending || !canSend}>
              <Eye className="h-3.5 w-3.5" /> M&apos;envoyer un aperçu
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setSaveModalOpen(true)} disabled={pending || !canSend}>
              <Save className="h-3.5 w-3.5" /> Enregistrer comme modèle
            </Button>
            <Button
              type="button"
              variant={confirming ? "danger" : "primary"}
              size="sm"
              onClick={send}
              disabled={pending || !canSend || count === 0 || unfilled.length > 0}
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
            <p className="-mt-3 flex items-center gap-1.5 text-xs text-error">
              <AlertTriangle className="h-3.5 w-3.5" /> Cet envoi est immédiat et irréversible.
            </p>
          )}
        </div>

        {/* Live preview */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Aperçu</span>
            <div className="flex rounded-md border border-border bg-card p-0.5" role="group" aria-label="Taille de l'aperçu">
              {(
                [
                  ["desktop", Monitor, "Ordinateur"],
                  ["phone", Smartphone, "Téléphone"],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDevice(value)}
                  aria-pressed={device === value}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium",
                    device === value ? "bg-card-active text-gold" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-text-primary">
                {subject.trim() ? personalize(subject, SAMPLE_FIRST_NAME) : <span className="text-text-muted">Sujet de l&apos;e-mail</span>}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">L&apos;équipe ASCEND · aperçu pour « {SAMPLE_FIRST_NAME} »</p>
            </div>
            <div className="flex justify-center bg-[#f2f0eb]">
              {previewHtml ? (
                <iframe
                  title="Aperçu de l'e-mail"
                  srcDoc={previewHtml}
                  sandbox=""
                  className={cn("h-[680px] border-0 bg-[#f2f0eb]", device === "phone" ? "w-[375px] max-w-full" : "w-full")}
                />
              ) : (
                <p className="px-6 py-24 text-center text-sm text-[#8a857b]">Choisis un modèle ou écris ton message : l&apos;aperçu s&apos;affiche ici.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
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
