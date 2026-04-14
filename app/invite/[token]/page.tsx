import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { InviteActions } from "./_components/InviteActions";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const { userId } = await auth();

  if (userId) {
    redirect(`/invite/${token}/complete`);
  }

  const { data: invitation } = await supabaseAdmin
    .from("invitations")
    .select("id, email, accepted, organisations(name)")
    .eq("token", token)
    .single();

  const org = invitation?.organisations as unknown as { name: string } | null;

  // Invalid or already used
  if (!invitation || invitation.accepted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Logo />
          <div className="mt-10 rounded-xl border border-border bg-card p-8">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path
                  d="M9 3v6M9 12.5v.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-destructive"
                />
                <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.2" className="text-destructive" />
              </svg>
            </div>
            <h1 className="mt-4 text-[15px] font-semibold text-foreground">
              Invitation invalid
            </h1>
            <p className="mt-2 text-[13px] text-muted-foreground">
              This invitation is invalid or has already been used.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Logo />
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          {/* Heading */}
          <div className="mb-6 text-center">
            <h1 className="text-[15px] font-semibold text-foreground">
              You've been invited to join
            </h1>
            <p className="mt-0.5 text-[15px] font-semibold text-primary">
              {org?.name ?? "an organisation"}
            </p>
            <p className="mt-3 text-[13px] text-muted-foreground">
              This invitation was sent to{" "}
              <span className="font-medium text-foreground">{invitation.email}</span>
            </p>
          </div>

          <InviteActions token={token} />
        </div>

        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          By continuing, you agree to Modal Studio's terms of service.
        </p>
      </div>
    </div>
  );
}

function Logo() {
  return (
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
  );
}
