import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "@/app/components/PageHeader";

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

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name")
    .eq("organisation_id", org.id)
    .eq("slug", projectSlug)
    .single();

  if (!project) redirect(`/${orgSlug}/projects`);

  const { data: modalMap } = await supabaseAdmin
    .from("modal_maps")
    .select("id, name")
    .eq("project_id", project.id)
    .eq("slug", modalMapSlug)
    .single();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Projects", href: `/${orgSlug}/projects` },
          { label: project.name, href: `/${orgSlug}/${projectSlug}` },
          { label: modalMap?.name ?? "Modal Map" },
        ]}
      />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[13px] text-muted-foreground">
          Modal map editor coming soon
        </p>
      </div>
    </>
  );
}
