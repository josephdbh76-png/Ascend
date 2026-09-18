import { cn } from "@/lib/utils";
import { TITLE_ICONS, TITLE_RARITY_STYLES } from "@/lib/titleDisplay";
import type { TitleRarity } from "@/types/database.types";

/** Small rarity-colored pill shown next to a member's name wherever they appear in a list. */
export function TitleBadge({ title }: { title: { name: string; icon: string; rarity: TitleRarity } }) {
  const Icon = TITLE_ICONS[title.icon] ?? TITLE_ICONS.gem;
  return (
    <span
      title={title.name}
      className={cn(
        "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        TITLE_RARITY_STYLES[title.rarity],
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {title.name}
    </span>
  );
}
