"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { COUNTRIES } from "@/lib/constants";
import { initials } from "@/lib/utils";
import { updateProfileAction, uploadAvatarAction } from "./actions";
import { uploadThen } from "@/lib/uploadClient";
import { AvatarCropper } from "@/components/profile/AvatarCropper";

export function ProfileSettingsForm({
  initial,
  initialAvatarUrl,
}: {
  initial: { firstName: string; lastName: string; bio: string; country: string; city: string };
  initialAvatarUrl: string | null;
}) {
  const [form, setForm] = useState(initial);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProfileAction(form);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Profil mis à jour.", "success");
      router.refresh();
    });
  }

  function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return toast.show("Format non supporté (JPG, PNG ou WebP).", "error");
    }
    setCropFile(file);
  }

  function saveCroppedAvatar(cropped: File) {
    setUploadingAvatar(true);
    startTransition(async () => {
      const result = await uploadThen("avatar", cropped, uploadAvatarAction);
      setUploadingAvatar(false);
      if (!result.success) return toast.show(result.error, "error");
      setAvatarUrl(result.data.url);
      setCropFile(null);
      toast.show("Photo de profil mise à jour.", "success");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          id="photo"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-elevated text-lg font-semibold text-gold"
          aria-label="Changer la photo de profil"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(form.firstName, form.lastName)
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-5 w-5 text-white" />
          </span>
        </button>
        <div>
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
            {uploadingAvatar ? "Envoi..." : "Changer la photo"}
          </Button>
          <p className="mt-1 text-xs text-text-muted">JPG, PNG ou WebP. Tu la recadres juste après.</p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onAvatarSelected} />
        {cropFile && (
          <AvatarCropper file={cropFile} pending={uploadingAvatar} onCancel={() => setCropFile(null)} onConfirm={saveCroppedAvatar} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom">
          <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </Field>
        <Field label="Nom">
          <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pays">
          <Select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ville" hint="Utilisée pour te trouver dans le Réseau.">
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
      </div>
      <Field label="Bio" htmlFor="bio" hint={`${form.bio.length}/280`}>
        <Textarea
          id="bio"
          rows={3}
          maxLength={280}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
      </Field>
      <Button type="submit" disabled={pending} className="self-start">
        Enregistrer
      </Button>
    </form>
  );
}
