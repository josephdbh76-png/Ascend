import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Eye, Flag, GraduationCap, Layers, MonitorPlay } from "lucide-react";
import { ViewerShell } from "@/components/layout/ViewerShell";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { TrainingCard } from "@/components/trainings/TrainingCard";
import { TrainingCover } from "@/components/trainings/TrainingCover";
import { TrainingOffer } from "@/components/trainings/TrainingOffer";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCurrentViewer } from "@/services/viewer.service";
import { getBetaMode } from "@/services/platform.service";
import { getTrainingForViewer, listPublishedTrainings, recordTrainingEvent } from "@/services/training.service";
import { TRAINING_FORMATS, themeLabel, trainingPath } from "@/lib/trainings";
import { LEGAL } from "@/lib/legal";
import { getAppUrl } from "@/lib/utils";

const loadTraining = cache(async (id: string) => getTrainingForViewer(id, await getCurrentViewer()));

export async function generateMetadata({ params }: PageProps<"/formations/[id]">): Promise<Metadata> {
  const { id } = await params;
  const t = await loadTraining(id);
  if (!t) return { title: "Formation introuvable", robots: { index: false, follow: false } };
  const path = trainingPath(t.id);
  return {
    title: t.title,
    description: t.summary,
    alternates: { canonical: path },
    robots: t.status === "published" ? undefined : { index: false, follow: false },
    openGraph: {
      title: t.title,
      description: t.summary,
      url: path,
      type: "website",
      images: t.coverImageUrl ? [{ url: t.coverImageUrl }] : undefined,
    },
    twitter: { card: t.coverImageUrl ? "summary_large_image" : "summary", title: t.title, description: t.summary },
  };
}

const STATUS_NOTICE = {
  pending: "Aperçu : cette formation est en cours de relecture par l'équipe ASCEND. Elle n'est pas encore visible des autres membres.",
  rejected: "Aperçu : cette formation n'a pas été validée. Corrige-la depuis tes réglages pour la renvoyer.",
  archived: "Aperçu : cette formation est archivée et n'apparaît plus dans le catalogue.",
} as const;

export default async function TrainingPage({ params }: PageProps<"/formations/[id]">) {
  const { id } = await params;
  const [t, viewer, beta] = await Promise.all([loadTraining(id), getCurrentViewer(), getBetaMode()]);
  if (!t) notFound();

  if (t.status === "published") {
    const h = await headers();
    const visitor = {
      userId: viewer.userId,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    };
    after(() => recordTrainingEvent(t, "view", visitor));
  }

  const related = (await listPublishedTrainings({ theme: t.theme, limit: 12 }, viewer)).filter((r) => r.id !== t.id).slice(0, 3);
  const appUrl = getAppUrl();
  const url = `${appUrl}${trainingPath(t.id)}`;
  const creatorUrl = t.creator.username ? `${appUrl}/profile/${t.creator.username}` : undefined;

  return (
    <ViewerShell>
      {t.status === "published" && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Course",
            name: t.title,
            description: t.summary,
            url,
            inLanguage: "fr-FR",
            ...(t.coverImageUrl ? { image: t.coverImageUrl } : {}),
            provider: {
              "@type": t.creator.username ? "Person" : "Organization",
              name: t.creator.name,
              ...(creatorUrl ? { url: creatorUrl } : {}),
            },
            offers: {
              "@type": "Offer",
              price: (t.priceCents / 100).toFixed(2),
              priceCurrency: "EUR",
              category: t.priceCents === 0 ? "Free" : "Paid",
              url,
            },
            hasCourseInstance: {
              "@type": "CourseInstance",
              courseMode: t.format === "in_person" ? "Onsite" : "Online",
            },
          }}
        />
      )}
      <div className="flex flex-col gap-8">
        {viewer.userId && <NetworkTabs active="trainings" />}

        {t.status !== "published" && (
          <p className="rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-text-primary">
            {STATUS_NOTICE[t.status]}
            {t.status === "rejected" && t.rejectionReason && <span className="mt-1 block text-text-secondary">Motif : {t.rejectionReason}</span>}
          </p>
        )}

        <nav aria-label="Fil d'Ariane" className="text-xs text-text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/formations" className="hover:text-text-primary">
                Formations
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={`/formations?theme=${t.theme}`} className="hover:text-text-primary">
                {themeLabel(t.theme)}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <article className="flex min-w-0 flex-col gap-6">
            <TrainingCover src={t.coverImageUrl} className="aspect-[16/9] w-full rounded-lg border border-border" />
            <div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-text-primary sm:text-3xl">{t.title}</h1>
              <p className="mt-3 text-base text-text-secondary">{t.summary}</p>
            </div>
            <ul className="flex flex-wrap gap-2 text-xs text-text-secondary">
              <li className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                <Layers className="h-3.5 w-3.5 text-gold" /> {themeLabel(t.theme)}
              </li>
              <li className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                <MonitorPlay className="h-3.5 w-3.5 text-gold" /> {TRAINING_FORMATS[t.format]}
              </li>
              {t.durationLabel && (
                <li className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-gold" /> {t.durationLabel}
                </li>
              )}
              {t.weekViews >= 10 && (
                <li className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                  <Eye className="h-3.5 w-3.5 text-gold" /> {t.weekViews} vues cette semaine
                </li>
              )}
            </ul>
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Le programme</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">{t.description}</p>
            </section>
          </article>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <TrainingOffer
              training={{
                id: t.id,
                priceCents: t.priceCents,
                memberPriceCents: t.memberPriceCents,
                promoCode: t.promoCode,
                hasPromoCode: t.hasPromoCode,
                offerUnlocked: t.offerUnlocked,
                audience: t.audience,
              }}
              signedIn={Boolean(viewer.userId)}
              beta={beta.enabled}
            />
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Proposée par</p>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-elevated text-sm font-semibold text-gold">
                  {t.creator.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.creator.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    t.creator.name.slice(0, 2).toUpperCase()
                  )}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold text-text-primary">
                    {t.creator.name}
                    {t.creator.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-gold" aria-label="Revenus vérifiés" />}
                  </p>
                  <p className="text-xs text-text-muted">
                    {t.creator.verified ? "Revenus vérifiés sur ASCEND" : t.creator.username ? `@${t.creator.username}` : "Partenaire ASCEND"}
                  </p>
                </div>
              </div>
              {t.creator.username && (
                <Link href={`/profile/${t.creator.username}`} className="text-sm font-medium text-gold hover:underline">
                  Voir son profil et son classement
                </Link>
              )}
            </div>
            <a
              href={`mailto:${LEGAL.contactEmail}?subject=${encodeURIComponent(`Signalement formation ${t.id}`)}`}
              className="flex items-center gap-1.5 self-start text-xs text-text-muted hover:text-text-secondary"
            >
              <Flag className="h-3.5 w-3.5" /> Signaler cette formation
            </a>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-text-muted">
              <GraduationCap className="h-4 w-4 text-gold" /> Dans le même thème
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <TrainingCard key={r.id} training={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </ViewerShell>
  );
}
