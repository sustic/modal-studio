"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ── Shared types ───────────────────────────────────────────────────────────────

export type ComponentType = "passive" | "active";

export type FrequencyRange = {
  base_low: number;
  base_high: number;
  safe_low: number | null;
  safe_high: number | null;
};

export type ModalMapComponent = {
  id: string;
  name: string;
  description: string | null;
  component_type: ComponentType;
  display_order: number;
  source_template_id: string | null;
  frequency_ranges: FrequencyRange[];
};

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string | null;
  component_type: ComponentType;
  frequency_ranges: FrequencyRange[];
};

// ── addComponentToModalMap ─────────────────────────────────────────────────────

export async function addComponentToModalMap(
  orgSlug: string,
  projectSlug: string,
  input: {
    modalMapId: string;
    name: string;
    description: string | null;
    componentType: ComponentType;
    frequencyRanges: FrequencyRange[];
    sourceTemplateId?: string;
    displayOrder: number;
  }
): Promise<{ success: true; component: ModalMapComponent } | { success: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Not authenticated." };

  // Re-verify org from slug (never trust client-provided IDs)
  const { data: org } = await supabaseAdmin
    .from("organisations")
    .select("id")
    .eq("slug", orgSlug)
    .single();
  if (!org) return { success: false, error: "Organisation not found." };

  // Verify owner or editor role
  const { data: membership } = await supabaseAdmin
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", org.id)
    .eq("clerk_user_id", userId)
    .single();
  if (!membership || !["owner", "editor"].includes(membership.role)) {
    return { success: false, error: "You don't have permission to add components." };
  }

  // Resolve project from slug
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("organisation_id", org.id)
    .eq("slug", projectSlug)
    .single();
  if (!project) return { success: false, error: "Project not found." };

  // Insert the component
  const { data: component, error: insertError } = await supabaseAdmin
    .from("modal_map_components")
    .insert({
      modal_map_id: input.modalMapId,
      project_id: project.id,
      organisation_id: org.id,
      name: input.name,
      description: input.description,
      component_type: input.componentType,
      source_template_id: input.sourceTemplateId ?? null,
      display_order: input.displayOrder,
      created_by: userId,
    })
    .select("id, name, description, component_type, display_order, source_template_id")
    .single();

  if (insertError || !component) {
    return {
      success: false,
      error: insertError?.message ?? "Failed to create component.",
    };
  }

  // Insert frequency ranges (batch insert; non-fatal if it fails)
  console.log("[addComponent] raw frequencyRanges received:", JSON.stringify(input.frequencyRanges));
  const savedRanges: FrequencyRange[] = [];
  const rangesToInsert = input.frequencyRanges
    .filter((r) => r.base_low != null)
    .map((r) => ({
      modal_map_component_id: component.id,
      base_low:  r.base_low,
      base_high: r.base_high ?? null,
      safe_low:  r.safe_low  ?? null,
      safe_high: r.safe_high ?? null,
    }));
  console.log("[addComponent] rangesToInsert:", JSON.stringify(rangesToInsert));
  if (rangesToInsert.length > 0) {
    const insertResult = await supabaseAdmin
      .from("modal_map_component_frequency_ranges")
      .insert(rangesToInsert)
      .select("base_low, base_high, safe_low, safe_high");
    console.log("[addComponent] insert result:", JSON.stringify(insertResult));

    const { data: ranges, error: rangesError } = insertResult;
    if (rangesError) {
      console.error("Failed to insert frequency ranges:", rangesError.message);
    } else {
      for (const r of ranges ?? []) {
        savedRanges.push({
          base_low:  Number(r.base_low),
          base_high: r.base_high != null ? Number(r.base_high) : null,
          safe_low:  r.safe_low  != null ? Number(r.safe_low)  : null,
          safe_high: r.safe_high != null ? Number(r.safe_high) : null,
        });
      }
    }
  }

  return {
    success: true,
    component: {
      id:                 component.id,
      name:               component.name,
      description:        component.description,
      component_type:     component.component_type as ComponentType,
      display_order:      component.display_order,
      source_template_id: component.source_template_id,
      frequency_ranges:   savedRanges,
    },
  };
}

// ── getProjectTemplates ────────────────────────────────────────────────────────

export async function getProjectTemplates(
  orgSlug: string,
  projectSlug: string
): Promise<ProjectTemplate[]> {
  const { userId } = await auth();
  if (!userId) return [];

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

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("organisation_id", org.id)
    .eq("slug", projectSlug)
    .single();
  if (!project) return [];

  const { data: templates } = await supabaseAdmin
    .from("project_components")
    .select(
      "id, name, description, component_type, project_component_frequency_ranges(base_low, base_high, safe_low, safe_high)"
    )
    .eq("project_id", project.id)
    .order("name", { ascending: true });

  return (templates ?? []).map((t) => {
    const ranges = (
      t.project_component_frequency_ranges as Array<{
        base_low: number; base_high: number; safe_low: number | null; safe_high: number | null;
      }> ?? []
    );
    return {
      id:              t.id,
      name:            t.name,
      description:     t.description,
      component_type:  (t.component_type ?? "passive") as ComponentType,
      frequency_ranges: ranges.map((r) => ({
        base_low:  Number(r.base_low),
        base_high: Number(r.base_high),
        safe_low:  r.safe_low  != null ? Number(r.safe_low)  : null,
        safe_high: r.safe_high != null ? Number(r.safe_high) : null,
      })),
    };
  });
}
