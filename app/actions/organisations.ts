"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type CreateOrgState =
  | null
  | { success: false; error: string }
  | { success: true; orgName: string; token: string };

export async function createOrganisation(
  prevState: CreateOrgState,
  formData: FormData
): Promise<CreateOrgState> {
  const { userId } = await auth();
  if (!userId || userId !== process.env.NEXT_PUBLIC_SUPERADMIN_CLERK_ID) {
    redirect("/sign-in");
  }

  const name = (formData.get("name") as string).trim();
  const slug = (formData.get("slug") as string).trim();
  const description = (formData.get("description") as string).trim() || null;
  const allowed_domain = (formData.get("allowed_domain") as string).trim() || null;
  const email = (formData.get("email") as string).trim();

  if (!name || !slug || !email) {
    return { success: false, error: "Name, slug, and first user email are required." };
  }

  const { data: org, error: orgError } = await supabaseAdmin
    .from("organisations")
    .insert({ name, slug, description, allowed_domain })
    .select()
    .single();

  if (orgError) {
    return {
      success: false,
      error: orgError.code === "23505"
        ? `A organisation with slug "${slug}" already exists.`
        : orgError.message,
    };
  }

  const token = randomUUID();

  const { error: inviteError } = await supabaseAdmin
    .from("invitations")
    .insert({
      organisation_id: org.id,
      email,
      role: "owner",
      invited_by: userId,
      token,
    });

  if (inviteError) {
    return { success: false, error: inviteError.message };
  }

  return { success: true, orgName: name, token };
}
