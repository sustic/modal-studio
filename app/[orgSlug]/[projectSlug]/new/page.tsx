import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "@/app/components/PageHeader";
import { NewModalMapForm } from "./NewModalMapForm";

interface Props {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}

export default async function NewModalMapPage({ params }: Props) {
  const { orgSlug, projectSlug } = await params;
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  // Resolve org
  const { data: org } = await supabaseAdmin
    .from("organisations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) redirect("/waiting");

  // Verify owner or editor role
  const { data: membership } = await supabaseAdmin
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", org.id)
    .eq("clerk_user_id", userId)
    .single();

  if (!membership || !["owner", "editor"].includes(membership.role)) {
    redirect(`/${orgSlug}/${projectSlug}`);
  }

  // Fetch project name for the breadcrumb
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name")
    .eq("organisation_id", org.id)
    .eq("slug", projectSlug)
    .single();

  if (!project) redirect(`/${orgSlug}/projects`);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Projects", href: `/${orgSlug}/projects` },
          { label: project.name, href: `/${orgSlug}/${projectSlug}` },
          { label: "New Modal Map" },
        ]}
      />
      <div className="flex flex-1 flex-col px-8 py-8">
        <div className="w-full max-w-xl">
          <NewModalMapForm orgSlug={orgSlug} projectSlug={projectSlug} />
        </div>
      </div>
    </>
  );
}
