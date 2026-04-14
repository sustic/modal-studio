"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CreateModalMapState =
  | null
  | { success: false; error: string; fields?: Record<string, string> }
  | { success: true };

export async function createModalMap(
  orgSlug: string,
  projectSlug: string,
  prevState: CreateModalMapState,
  formData: FormData
): Promise<CreateModalMapState> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const name = (formData.get("name") as string).trim();
  const slugInput = (formData.get("slug") as string).trim();
  const description = (formData.get("description") as string).trim() || null;
  const slug = slugInput || toSlug(name);

  if (!name || !slug) {
    return {
      success: false,
      error: "Modal map name and slug are required.",
      fields: { name, slug, description: description ?? "" },
    };
  }

  // Resolve org + verify owner or editor
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
    return { success: false, error: "You don't have permission to create modal maps." };
  }

  // Resolve project
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("organisation_id", org.id)
    .eq("slug", projectSlug)
    .single();

  if (!project) return { success: false, error: "Project not found." };

  // Insert the modal map
  const { data: modalMap, error: insertError } = await supabaseAdmin
    .from("modal_maps")
    .insert({
      project_id: project.id,
      organisation_id: org.id,
      name,
      slug,
      description,
      created_by: userId,
    })
    .select("slug")
    .single();

  if (insertError) {
    return {
      success: false,
      error:
        insertError.code === "23505"
          ? `A modal map with slug "${slug}" already exists in this project.`
          : insertError.message,
      fields: { name, slug, description: description ?? "" },
    };
  }

  redirect(`/${orgSlug}/${projectSlug}/${modalMap.slug}`);
}
