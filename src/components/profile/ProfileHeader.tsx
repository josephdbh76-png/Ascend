import { CheckCircle2, MapPin, Calendar, Globe2, Flag as FlagIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ShareProfileButton } from "./ShareProfileButton";
import { formatCurrency, formatCurrencyRange, formatPercent, initials } from "@/lib/utils";
import { COUNTRIES } from "@/lib/constants";
import type { PublicProfile } from "@/types";

function countryLabel(code: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.value === code)?.label ?? code;
}

export function ProfileHeader({ profile, isOwner }: { profile: PublicProfile; isOwner: boolean }) {
  const revenueDisplay =
    profile.revenueVisibility === "exact" && profile.revenueDisplayCents != null
      ? `${formatCurrency(profile.revenueDisplayCents)} / month`
      : profile.revenueVisibility === "range" &&
          profile.revenueRangeMinCents != null &&
          profile.revenueRangeMaxCents != null
        ? `${formatCurrencyRange(profile.revenueRangeMinCents, profile.revenueRangeMaxCents)} / month`
        : null;

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border-strong bg-card-elevated text-2xl font-semibold text-gold">
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
            {profile.foundingMemberNumber && (
              <Badge variant="exclusive">Founding Member #{String(profile.foundingMemberNumber).padStart(3, "0")}</Badge>
            )}
            {profile.isDemo && <Badge variant="demo">Demo</Badge>}
          </div>
          <p className="text-sm text-text-muted">@{profile.username}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
            {profile.country && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {countryLabel(profile.country)}
              </span>
            )}
            <span>{profile.businessCategory.charAt(0).toUpperCase() + profile.businessCategory.slice(1)} Founder</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Member since {new Date(profile.memberSince).getFullYear()}
            </span>
          </div>
        </div>

        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          {isOwner && (
            <Badge variant="neutral" className="hidden sm:inline-flex">
              Your profile
            </Badge>
          )}
          <ShareProfileButton username={profile.username} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-6 sm:grid-cols-4">
        <Stat label="Verification">
          {profile.revenueVerified ? (
            <span className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="h-4 w-4" /> Verified
            </span>
          ) : (
            <span className="text-text-muted">Unverified</span>
          )}
        </Stat>
        <Stat label="Monthly Revenue">
          <span className="tabular-nums text-text-primary">{revenueDisplay ?? "Private"}</span>
        </Stat>
        <Stat label="Growth">
          {profile.growthPercent != null ? (
            <span className={profile.growthPercent >= 0 ? "text-success" : "text-error"}>
              {formatPercent(profile.growthPercent)}
            </span>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </Stat>
        <Stat label="Rank">
          <span className="flex items-center gap-3">
            {profile.globalRank && (
              <span className="flex items-center gap-1 text-gold">
                <Globe2 className="h-3.5 w-3.5" /> #{profile.globalRank}
              </span>
            )}
            {profile.countryRank && (
              <span className="flex items-center gap-1 text-text-secondary">
                <FlagIcon className="h-3.5 w-3.5" /> #{profile.countryRank}
              </span>
            )}
            {!profile.globalRank && !profile.countryRank && <span className="text-text-muted">Unranked</span>}
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
