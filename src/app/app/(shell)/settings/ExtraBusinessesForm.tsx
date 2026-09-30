"use client";

import { useState, useTransition } from "react";
import { Globe, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { MAX_EXTRA_BUSINESSES } from "@/lib/constants";
import { activityLabel, normalizeWebsite, websiteHost } from "@/lib/business";
import { deleteExtraBusinessAction, saveExtraBusinessAction } from "./actions";
import { BusinessFields, EMPTY_BUSINESS, type BusinessFormValues } from "./BusinessFields";

export interface ExtraBusiness {
  id: string;
  name: string;
  category: string;
  customCategory: string | null;
  description: string | null;
  website: string | null;
}

function toValues(item: ExtraBusiness): BusinessFormValues {
  return {
    name: item.name,
    category: item.category,
    customCategory: item.customCategory ?? "",
    description: item.description ?? "",
    website: item.website ?? "",
  };
}

export function ExtraBusinessesForm({ initial }: { initial: ExtraBusiness[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<BusinessFormValues>(EMPTY_BUSINESS);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const canAdd = items.length < MAX_EXTRA_BUSINESSES;

  function open(id: string, values: BusinessFormValues) {
    setDraft(values);
    setEditing(id);
    setConfirmingDelete(null);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const id = editing && editing !== "new" ? editing : undefined;
    startTransition(async () => {
      const result = await saveExtraBusinessAction({ ...draft, id });
      if (!result.success) return toast.show(result.error, "error");
      const saved: ExtraBusiness = {
        id: result.data.id,
        name: draft.name.trim(),
        category: draft.category,
        customCategory: draft.customCategory.trim() || null,
        description: draft.description.trim() || null,
        website: normalizeWebsite(draft.website),
      };
      setItems((prev) => (id ? prev.map((item) => (item.id === id ? saved : item)) : [...prev, saved]));
      setEditing(null);
      toast.show(id ? "Activité mise à jour." : "Activité ajoutée à ton profil.", "success");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteExtraBusinessAction(id);
      if (!result.success) return toast.show(result.error, "error");
      setItems((prev) => prev.filter((item) => item.id !== id));
      setConfirmingDelete(null);
      toast.show("Activité retirée de ton profil.", "success");
    });
  }

  const form = (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-md border border-gold/30 bg-bg-primary/40 p-4">
      <BusinessFields values={draft} onChange={setDraft} idPrefix={`extra-${editing ?? "new"}`} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !draft.name.trim()}>
          {pending ? "Enregistrement..." : editing === "new" ? "Ajouter" : "Enregistrer"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={pending}>
          Annuler
        </Button>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Une marque, une chaîne, une activité de conseil à côté ? Présente tous tes projets sur ton profil. Le
        classement reste calculé sur l&apos;ensemble de tes revenus vérifiés.
      </p>

      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item) =>
            editing === item.id ? (
              <li key={item.id}>{form}</li>
            ) : (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border bg-bg-primary/40 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{item.name}</p>
                  <p className="text-xs font-medium text-gold">{activityLabel(item.category, item.customCategory)}</p>
                  {item.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">{item.description}</p>
                  )}
                  {item.website && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-text-muted">
                      <Globe className="h-3 w-3" /> {websiteHost(item.website)}
                    </p>
                  )}
                </div>
                {confirmingDelete === item.id ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant="danger" onClick={() => remove(item.id)} disabled={pending}>
                      Retirer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(null)} disabled={pending}>
                      Garder
                    </Button>
                  </div>
                ) : (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => open(item.id, toValues(item))}
                      aria-label={`Modifier ${item.name}`}
                      className="rounded-sm p-1.5 text-text-muted transition-colors hover:text-text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(item.id)}
                      aria-label={`Retirer ${item.name}`}
                      className="rounded-sm p-1.5 text-text-muted transition-colors hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      {editing === "new" ? (
        form
      ) : (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => open("new", EMPTY_BUSINESS)}
            disabled={!canAdd || editing !== null}
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter une activité
          </Button>
          <span className="text-xs tabular-nums text-text-muted">
            {items.length}/{MAX_EXTRA_BUSINESSES}
          </span>
        </div>
      )}
    </div>
  );
}
