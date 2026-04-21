import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WorkplaceClient } from "./WorkplaceClient";
import type { ModalMapComponent } from "@/app/actions/components";

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

  const { data: rawComponents } = await supabaseAdmin
    .from("modal_map_components")
    .select(
      "id, name, description, component_type, display_order, source_template_id, modal_map_component_frequency_ranges(base_low, base_high, safe_low, safe_high)"
    )
    .eq("modal_map_id", modalMap.id)
    .order("display_order", { ascending: true })
    .order("created_at",    { ascending: true });

  const components: ModalMapComponent[] = (rawComponents ?? []).map((c) => ({
    id:                 c.id,
    name:               c.name,
    description:        c.description,
    component_type:     (c.component_type ?? "passive") as "passive" | "active",
    display_order:      c.display_order ?? 0,
    source_template_id: c.source_template_id,
    frequency_ranges:   (
      c.modal_map_component_frequency_ranges as Array<{
        base_low: number; base_high: number; safe_low: number | null; safe_high: number | null;
      }> ?? []
    ).map((r) => ({
      base_low:  Number(r.base_low),
      base_high: Number(r.base_high),
      safe_low:  r.safe_low  != null ? Number(r.safe_low)  : null,
      safe_high: r.safe_high != null ? Number(r.safe_high) : null,
    })),
  }));

  return (
    <WorkplaceClient
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      projectName={project.name}
      modalMap={{ id: modalMap.id, name: modalMap.name }}
      components={components}
    />
  );
}
