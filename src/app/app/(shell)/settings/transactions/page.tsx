import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listBankTransactions } from "@/services/bank.service";
import { TransactionsList } from "./TransactionsList";

export const metadata: Metadata = { title: "Mes transactions bancaires" };

export default async function BankTransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: source } = await supabase
    .from("revenue_sources")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("provider", "bank")
    .maybeSingle();

  if (!source || source.status !== "connected") redirect("/app/settings#comptes-connectes");

  const transactions = await listBankTransactions(user.id, source.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/app/settings#comptes-connectes" className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour aux réglages
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">Mes transactions bancaires</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Coche les virements entrants qui correspondent à ton revenu professionnel — le reste (virements
          personnels, remboursements...) n&apos;est jamais compté.
        </p>
      </div>

      <TransactionsList initial={transactions} />
    </div>
  );
}
