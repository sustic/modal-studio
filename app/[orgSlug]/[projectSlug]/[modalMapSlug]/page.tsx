import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WorkplaceClient } from "./WorkplaceClient";

interface Props {
  params: Promise<{ orgSlug: string; projectSlug: string; modalMapSlug: string }>;
}

export default async function ModalMapPage({ params }: Props) {
  const { orgSlug, projectSlug, modalMapSlug } = await params;
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

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

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name")
    .eq("organisation_id", org.id)
    .eq("slug", projectSlug)
    .single();

  if (!project) redirect(`/${orgSlug}/projects`);

  const { data: modalMap } = await supabaseAdmin
    .from("modal_maps")
    .select("id, name, slug")
    .eq("project_id", project.id)
    .eq("slug", modalMapSlug)
    .single();

  if (!modalMap) redirect(`/${orgSlug}/${projectSlug}`);

  const { data: components } = await supabaseAdmin
    .from("components")
    .select("id, name, description")
    .eq("modal_map_id", modalMap.id)
    .order("created_at", { ascending: true });

  return (
    <WorkplaceClient
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      projectName={project.name}
      modalMap={{ id: modalMap.id, name: modalMap.name }}
      components={components ?? []}
    />
  );
}
