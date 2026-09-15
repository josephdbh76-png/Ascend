"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { startConversationAction } from "@/app/app/(shell)/messages/actions";

export function MessageButton({ targetUserId, size = "sm" }: { targetUserId: string; size?: "sm" | "md" }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function open() {
    startTransition(async () => {
      const result = await startConversationAction(targetUserId);
      if (!result.success) return toast.show(result.error, "error");
      router.push(`/app/messages/${result.data.conversationId}`);
    });
  }

  return (
    <Button variant="secondary" size={size} onClick={open} disabled={pending} className="shrink-0">
      <MessageCircle className="h-3.5 w-3.5" /> Message
    </Button>
  );
}
