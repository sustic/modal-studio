import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "@/app/components/PageHeader";
import { NewProjectForm } from "./NewProjectForm";

interface Props {
  params: Promise<{ orgSlug: string }>;
}

export default async function NewProjectPage({ params }: Props) {
  const { orgSlug } = await params;
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
    redirect(`/${orgSlug}/projects`);
  }

  // Fetch other projects for the import dropdown
  const { data: otherProjects } = await supabaseAdmin
    .from("projects")
    .select("id, name")
    .eq("organisation_id", org.id)
    .order("name", { ascending: true });

  return (
    <>
      <PageHeader title="New Project" />
      <div className="flex flex-1 flex-col px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-[12px] text-muted-foreground/50">
          <a
            href={`/${orgSlug}/projects`}
            className="transition-colors hover:text-muted-foreground"
          >
            Projects
          </a>
          <span>/</span>
          <span className="text-muted-foreground/70">New Project</span>
        </div>

        <div className="w-full max-w-xl">
          <NewProjectForm
            orgSlug={orgSlug}
            otherProjects={otherProjects ?? []}
          />
        </div>
      </div>
    </>
  );
}
