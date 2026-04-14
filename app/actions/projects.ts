"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type SidebarProject = {
  id: string;
  name: string;
  slug: string;
};

export async function getProjectsForOrg(
  orgSlug: string
): Promise<SidebarProject[]> {
  const { userId } = await auth();
  if (!userId || !orgSlug) return [];

  // Resolve org and verify membership in one pass
  const { data: org } = await supabaseAdmin
    .from("organisations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) return [];

  const { data: membership } = await supabaseAdmin
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", org.id)
    .eq("clerk_user_id", userId)
    .single();

  if (!membership) return [];

  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("id, name, slug")
    .eq("organisation_id", org.id)
    .order("updated_at", { ascending: false })
    .limit(6); // fetch 6 so we know if there are more than 5

  return (projects ?? []) as SidebarProject[];
}
