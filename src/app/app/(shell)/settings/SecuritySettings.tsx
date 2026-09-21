"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

type Factor = { id: string; status: "verified" | "unverified" };

export function SecuritySettings() {
  const [factor, setFactor] = useState<Factor | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp.find((f) => f.status === "verified");
    setFactor(verified ? { id: verified.id, status: "verified" } : null);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      const verified = data?.totp.find((f) => f.status === "verified");
      setFactor(verified ? { id: verified.id, status: "verified" } : null);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startEnroll() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) throw new Error(error?.message ?? "Erreur inconnue.");
      setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Impossible d'activer la double authentification.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrolling.factorId,
      });
      if (challengeError || !challenge) throw new Error(challengeError?.message ?? "Erreur inconnue.");

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrolling.factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw new Error("Code invalide — vérifie ton application d'authentification.");

      toast.show("Double authentification activée.", "success");
      setEnrolling(null);
      setCode("");
      await refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Code invalide.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!factor) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw new Error(error.message);
      toast.show("Double authentification désactivée.", "success");
      await refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Erreur inconnue.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-text-muted" />;
  }

  if (enrolling) {
    return (
      <form onSubmit={confirmEnroll} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Scanne ce code avec une application d&apos;authentification (Google Authenticator, 1Password...),
          puis saisis le code à 6 chiffres généré.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URI SVG from Supabase, not an optimizable remote image */}
        <img src={enrolling.qrCode} alt="Code QR de double authentification" className="h-40 w-40 self-center rounded-md bg-white p-2" />
        <p className="break-all text-center font-mono text-xs text-text-muted">{enrolling.secret}</p>
        <Field label="Code à 6 chiffres">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoFocus
            placeholder="123456"
          />
        </Field>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setEnrolling(null)} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy || code.length !== 6}>
            Confirmer
          </Button>
        </div>
      </form>
    );
  }

  if (factor) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-success/30 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 text-sm text-success">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Double authentification activée
        </div>
        <Button variant="secondary" size="sm" onClick={disable} disabled={busy}>
          <ShieldOff className="h-3.5 w-3.5" /> Désactiver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-text-secondary">
        Protège ton compte avec un code à usage unique en plus de ton mot de passe.
      </p>
      <Button variant="secondary" size="sm" onClick={startEnroll} disabled={busy} className="shrink-0">
        Activer
      </Button>
    </div>
  );
}
