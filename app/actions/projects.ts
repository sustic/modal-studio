"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
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

// ─────────────────────────────────────────────────────────────────────────────

export type CreateProjectState =
  | null
  | { success: false; error: string; fields?: Record<string, string> }
  | { success: true };

export async function createProject(
  orgSlug: string,
  prevState: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const name = (formData.get("name") as string).trim();
  const slug = (formData.get("slug") as string).trim();
  const description = (formData.get("description") as string).trim() || null;
  const importEnabled = formData.get("importEnabled") === "on";
  const importProjectId = (formData.get("importProjectId") as string) || null;

  if (!name || !slug) {
    return {
      success: false,
      error: "Project name and slug are required.",
      fields: { name, slug, description: description ?? "" },
    };
  }

  // Resolve org + verify caller is owner or editor
  const { data: org } = await supabaseAdmin
    .from("organisations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) return { success: false, error: "Organisation not found." };

  const { data: membership } = await supabaseAdmin
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", org.id)
    .eq("clerk_user_id", userId)
    .single();

  if (!membership || !["owner", "editor"].includes(membership.role)) {
    return { success: false, error: "You don't have permission to create projects." };
  }

  // Insert the new project
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .insert({
      organisation_id: org.id,
      name,
      slug,
      description,
      created_by: userId,
    })
    .select("id, slug")
    .single();

  if (projectError) {
    return {
      success: false,
      error:
        projectError.code === "23505"
          ? `A project with slug "${slug}" already exists in this organisation.`
          : projectError.message,
      fields: { name, slug, description: description ?? "" },
    };
  }

  // Import components from another project if requested
  if (importEnabled && importProjectId && project) {
    // Verify the source project belongs to this org
    const { data: sourceProject } = await supabaseAdmin
      .from("projects")
      .select("id, name")
      .eq("id", importProjectId)
      .eq("organisation_id", org.id)
      .single();

    if (sourceProject) {
      // Fetch all components from the source project (via its modal maps)
      const { data: sourceComponents } = await supabaseAdmin
        .from("components")
        .select("name, description")
        .in(
          "modal_map_id",
          (
            await supabaseAdmin
              .from("modal_maps")
              .select("id")
              .eq("project_id", sourceProject.id)
          ).data?.map((m) => m.id) ?? []
        );

      if (sourceComponents && sourceComponents.length > 0) {
        // Create a single "imported" modal map to hold the copied components
        const { data: importedMap } = await supabaseAdmin
          .from("modal_maps")
          .insert({
            project_id: project.id,
            organisation_id: org.id,
            name: `Imported from ${sourceProject.name}`,
            created_by: userId,
          })
          .select("id")
          .single();

        if (importedMap) {
          await supabaseAdmin.from("components").insert(
            sourceComponents.map((c) => ({
              modal_map_id: importedMap.id,
              organisation_id: org.id,
              name: c.name,
              description: c.description,
              created_by: userId,
            }))
          );
        }
      }
    }
  }

  redirect(`/${orgSlug}/${project.slug}`);
}
