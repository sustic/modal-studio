"use server";

import { render } from "@react-email/components";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resend } from "@/lib/resend";
import { InvitationEmail } from "@/app/components/emails/InvitationEmail";

export async function sendInvitationEmail(invitationId: string): Promise<{ error?: string }> {
  console.log("[sendInvitationEmail] called with invitationId:", invitationId);

  // Fetch the invitation with its organisation name
  const { data: invitation, error: fetchError } = await supabaseAdmin
    .from("invitations")
    .select("id, email, token, organisation_id, organisations(name)")
    .eq("id", invitationId)
    .single();

  console.log("[sendInvitationEmail] fetch result:", { invitation, fetchError });

  if (fetchError || !invitation) {
    return { error: fetchError?.message ?? "Invitation not found" };
  }

  const org = invitation.organisations as unknown as { name: string } | null;
  const organisationName = org?.name ?? "your organisation";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${invitation.token}`;

  console.log("[sendInvitationEmail] sending to:", invitation.email, "inviteUrl:", inviteUrl);

  const html = await render(
    InvitationEmail({ organisationName, inviteUrl })
  );

  const resendResponse = await resend.emails.send({
    from: "Modal Studio <onboarding@resend.dev>",
    to: invitation.email,
    subject: `You've been invited to join ${organisationName} on Modal Studio`,
    html,
  });

  console.log("[sendInvitationEmail] Resend response:", JSON.stringify(resendResponse));

  if (resendResponse.error) {
    console.error("[sendInvitationEmail] Resend error:", resendResponse.error);
    return { error: resendResponse.error.message };
  }

  // Stamp sent_at on the invitation row
  await supabaseAdmin
    .from("invitations")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", invitationId);

  console.log("[sendInvitationEmail] done, sent_at stamped");

  return {};
}
