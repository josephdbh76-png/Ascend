"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShareCardModal } from "@/components/achievements/ShareCardModal";
import { track } from "@/lib/analytics";

export function ShareProfileButton({
  username,
  isOwner = true,
  globalRank,
}: {
  username: string;
  isOwner?: boolean;
  globalRank?: number | null;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Visitors share the link; the preview shows the member's card.
  async function shareLink() {
    const url = `${window.location.origin}/profile/${username}`;
    track("profile_shared", { username });
    if (navigator.share) {
      try {
        await navigator.share({ title: "ASCEND", url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isOwner) {
    return (
      <>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Share2 className="h-3.5 w-3.5" /> Partager mon profil
        </Button>
        <ShareCardModal
          open={open}
          onClose={() => setOpen(false)}
          target={{ kind: "rank", username }}
          itemName={globalRank ? `#${globalRank}` : "Mon profil"}
        />
      </>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={shareLink}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Lien copié" : "Partager ce profil"}
    </Button>
  );
}
