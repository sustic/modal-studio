import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Look up which organisation this user belongs to
  const { data: membership } = await supabaseAdmin
    .from("organisation_members")
    .select("organisation_id, organisations(slug)")
    .eq("clerk_user_id", userId)
    .limit(1)
    .single();

  const org = membership?.organisations as unknown as { slug: string } | null;

  if (!org?.slug) {
    redirect("/waiting");
  }

  redirect(`/${org.slug}/projects`);
}
