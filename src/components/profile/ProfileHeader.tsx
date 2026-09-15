import { CheckCircle2, MapPin, Calendar, Globe2, Flag as FlagIcon, Crown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ShareProfileButton } from "./ShareProfileButton";
import { FollowButton } from "@/components/network/FollowButton";
import { MessageButton } from "@/components/network/MessageButton";
import { cn, formatCurrency, formatCurrencyRange, formatPercent, initials } from "@/lib/utils";
import { COUNTRIES, BUSINESS_CATEGORIES, ACCENT_THEMES } from "@/lib/constants";
import type { PublicProfile } from "@/types";

function countryLabel(code: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.value === code)?.label ?? code;
}

function categoryLabel(value: string) {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function ProfileHeader({
  profile,
  isOwner,
  viewerId,
  isFollowing,
  followerCount,
  followingCount,
  isCreator,
}: {
  profile: PublicProfile;
  isOwner: boolean;
  viewerId?: string | null;
  isFollowing?: boolean;
  followerCount?: number;
  followingCount?: number;
  isCreator?: boolean;
}) {
  const accent = ACCENT_THEMES.find((t) => t.id === profile.accentTheme) ?? ACCENT_THEMES[0];
  const revenueDisplay =
    profile.revenueVisibility === "exact" && profile.revenueDisplayCents != null
      ? `${formatCurrency(profile.revenueDisplayCents)} / mois`
      : profile.revenueVisibility === "range" &&
          profile.revenueRangeMinCents != null &&
          profile.revenueRangeMaxCents != null
        ? `${formatCurrencyRange(profile.revenueRangeMinCents, profile.revenueRangeMaxCents)} / mois`
        : null;

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 sm:p-8">
      {isCreator && (
        <div className="-mx-6 -mt-6 flex items-center gap-2 rounded-t-lg bg-gradient-to-r from-gold/20 via-gold/10 to-transparent px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-gold sm:-mx-8 sm:-mt-8 sm:px-8">
          <Crown className="h-3.5 w-3.5" /> A cofondé ASCEND
        </div>
      )}
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div
          className={cn(
            "flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border-strong text-2xl font-semibold",
            profile.avatarUrl ? "bg-card-elevated" : accent.bgClass,
            accent.textClass,
          )}
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt={profile.username} className="h-full w-full rounded-full object-cover" />
          ) : (
            initials(profile.firstName, profile.lastName)
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-text-primary">
              {profile.firstName} {profile.lastName}
            </h1>
            {profile.activeTitle && <Badge variant="gold">{profile.activeTitle.name}</Badge>}
            {profile.foundingMemberNumber && (
              <Badge variant="exclusive">Membre fondateur #{String(profile.foundingMemberNumber).padStart(3, "0")}</Badge>
            )}
            {profile.isDemo && <Badge variant="demo">Démo</Badge>}
          </div>
          <p className="text-sm text-text-muted">@{profile.username}</p>
          {(followerCount != null || followingCount != null) && (
            <div className="mt-1.5 flex items-center gap-3 text-xs text-text-secondary">
              <span>
                <span className="font-medium text-text-primary">{followerCount ?? 0}</span> abonnés
              </span>
              <span>
                <span className="font-medium text-text-primary">{followingCount ?? 0}</span> abonnements
              </span>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
            {profile.country && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {countryLabel(profile.country)}
              </span>
            )}
            <span>Fondateur {categoryLabel(profile.businessCategory)}</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Membre depuis {new Date(profile.memberSince).getFullYear()}
            </span>
          </div>
        </div>

        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          {isOwner && (
            <Badge variant="neutral" className="hidden sm:inline-flex">
              Ton profil
            </Badge>
          )}
          {!isOwner && viewerId && (
            <>
              <MessageButton targetUserId={profile.userId} />
              <FollowButton targetUserId={profile.userId} initialFollowing={isFollowing ?? false} />
            </>
          )}
          <ShareProfileButton username={profile.username} isOwner={isOwner} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-6 sm:grid-cols-4">
        <Stat label="Vérification">
          {profile.revenueVerified ? (
            <span className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="h-4 w-4" /> Vérifié
            </span>
          ) : (
            <span className="text-text-muted">Non vérifié</span>
          )}
        </Stat>
        <Stat label="Revenus mensuels">
          <span className="tabular-nums text-text-primary">{revenueDisplay ?? "Privé"}</span>
        </Stat>
        <Stat label="Croissance">
          {profile.growthPercent != null ? (
            <span className={profile.growthPercent >= 0 ? "text-success" : "text-error"}>
              {formatPercent(profile.growthPercent)}
            </span>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </Stat>
        <Stat label="Classement">
          <span className="flex items-center gap-3">
            {profile.globalRank && (
              <span className={cn("flex items-center gap-1", accent.textClass)}>
                <Globe2 className="h-3.5 w-3.5" /> #{profile.globalRank}
              </span>
            )}
            {profile.countryRank && (
              <span className="flex items-center gap-1 text-text-secondary">
                <FlagIcon className="h-3.5 w-3.5" /> #{profile.countryRank}
              </span>
            )}
            {!profile.globalRank && !profile.countryRank && <span className="text-text-muted">Non classé</span>}
          </span>
        </Stat>
      </div>

      {profile.bio && <p className="border-t border-border pt-6 text-sm leading-relaxed text-text-secondary">{profile.bio}</p>}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}
