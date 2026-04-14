import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InviteCompletePage({ params }: Props) {
  const { token } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/sign-in?redirect_url=/invite/${token}/complete`);
  }

  const user = await currentUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  // Fetch the invitation with org details
  const { data: invitation } = await supabaseAdmin
    .from("invitations")
    .select("id, email, role, accepted, organisation_id, organisations(id, slug)")
    .eq("token", token)
    .single();

  const org = invitation?.organisations as unknown as { id: string; slug: string } | null;

  // Already accepted — just send them to the org
  if (invitation?.accepted && org) {
    redirect(`/${org.slug}/projects`);
  }

  // Invalid token
  if (!invitation || !org) {
    return <ErrorView message="This invitation is invalid or has expired." />;
  }

  // Email mismatch
  if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <ErrorView
        message={`This invitation was sent to ${invitation.email}. You're signed in as ${userEmail}. Please sign in with the correct account.`}
      />
    );
  }

  // Insert membership — ignore conflict if already a member
  const { error: memberError } = await supabaseAdmin
    .from("organisation_members")
    .insert({
      organisation_id: invitation.organisation_id,
      clerk_user_id: userId,
      email: userEmail,
      role: invitation.role,
    })
    .select()
    .single();

  if (memberError && memberError.code !== "23505") {
    // 23505 = unique violation (already a member) — treat as success
    return <ErrorView message={`Failed to join organisation: ${memberError.message}`} />;
  }

  // Mark invitation as accepted
  await supabaseAdmin
    .from("invitations")
    .update({ accepted: true })
    .eq("id", invitation.id);

  redirect(`/${org.slug}/projects`);
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden>
              <rect width="18" height="18" rx="4" fill="#5B5BD6" />
              <path
                d="M5 9.5 L7.5 7 L9 9 L10.5 7 L13 9.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="text-[15px] font-semibold text-foreground">Modal Studio</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M9 3v6M9 12.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>
          <h1 className="mt-4 text-[15px] font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">{message}</p>
          <a
            href="/dashboard"
            className="mt-6 inline-block text-[13px] font-medium text-primary hover:underline"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
