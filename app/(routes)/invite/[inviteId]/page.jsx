"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/utils/supabase";

export default function InvitePage({ params }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user?.primaryEmailAddress?.emailAddress) {
      handleInvite();
    }
  }, [isLoaded, user]);

  const handleInvite = async () => {
    const { data, error } = await supabase
      .from("chats")
      .update({ user2_email: user.primaryEmailAddress.emailAddress })
      .eq("invite_link", `${window.location.origin}/invite/${params.inviteId}`)
      .select();

    if (error) {
      console.error("Error accepting invite:", error);
    } else if (data && data.length > 0) {
      router.push(`/chat/${data[0].id}`);
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Button size="lg">Sign in to accept the invite</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <p>Processing invite...</p>
    </div>
  );
}
