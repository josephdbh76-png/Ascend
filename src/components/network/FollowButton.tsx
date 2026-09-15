"use client";

import { useState, useTransition } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { toggleFollowAction } from "@/app/app/(shell)/network/actions";

export function FollowButton({
  targetUserId,
  initialFollowing,
  size = "sm",
}: {
  targetUserId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggle() {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      const result = await toggleFollowAction(targetUserId);
      if (!result.success) {
        setFollowing(!next);
        toast.show(result.error, "error");
      }
    });
  }

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      size={size}
      onClick={toggle}
      disabled={pending}
      className="shrink-0"
    >
      {following ? (
        <>
          <UserCheck className="h-3.5 w-3.5" /> Suivi
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" /> Suivre
        </>
      )}
    </Button>
  );
}
