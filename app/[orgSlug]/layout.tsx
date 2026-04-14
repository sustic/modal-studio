import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AppShell } from "@/app/components/AppShell";

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function OrgLayout({ children, params }: Props) {
  const { orgSlug } = await params;
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  // Verify membership via org slug
  const { data: org } = await supabaseAdmin
    .from("organisations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) redirect("/waiting");

  const { data: membership } = await supabaseAdmin
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", org.id)
    .eq("clerk_user_id", userId)
    .single();

  if (!membership) redirect("/waiting");

  const isSuperadmin = userId === process.env.NEXT_PUBLIC_SUPERADMIN_CLERK_ID;

  return <AppShell isSuperadmin={isSuperadmin}>{children}</AppShell>;
}
