import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserNames } from "@/lib/clerk-users";
import { PageHeader } from "@/app/components/PageHeader";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}

type ModalMap = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  created_by: string | null;
  updated_at: string;
  components: { count: number }[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function count(arr: { count: number }[]): number {
  return arr?.[0]?.count ?? 0;
}

export default async function ProjectPage({ params }: Props) {
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

  // Verify membership
  const { data: membership } = await supabaseAdmin
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", org.id)
    .eq("clerk_user_id", userId)
    .single();

  if (!membership) redirect("/waiting");

  // Fetch the project
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name, slug")
    .eq("organisation_id", org.id)
    .eq("slug", projectSlug)
    .single();

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center">
        <p className="text-[15px] font-semibold text-foreground">Project not found</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          This project doesn't exist or you don't have access to it.
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href={`/${orgSlug}/projects`}>Back to Projects</Link>
        </Button>
      </div>
    );
  }

  // Fetch modal maps with component counts
  const { data: modalMaps } = await supabaseAdmin
    .from("modal_maps")
    .select("id, name, slug, description, created_by, updated_at, components(count)")
    .eq("project_id", project.id)
    .order("updated_at", { ascending: false })
    .returns<ModalMap[]>();

  const userNames = await getUserNames((modalMaps ?? []).map((m) => m.created_by));

  const newModalMapHref = `/${orgSlug}/${projectSlug}/new`;

  return (
    <>
      <PageHeader title={project.name} />
      <div className="flex flex-1 flex-col px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-[12px] text-muted-foreground/50">
          <Link
            href={`/${orgSlug}/projects`}
            className="transition-colors hover:text-muted-foreground"
          >
            Projects
          </Link>
          <span>/</span>
          <span className="text-muted-foreground/70">{project.name}</span>
        </div>

        {/* Modal map grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(modalMaps ?? []).map((map) => (
            <Link
              key={map.id}
              href={`/${orgSlug}/${projectSlug}/${map.slug ?? map.id}`}
              className="group block"
            >
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px] font-semibold leading-snug">
                    {map.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pb-4">
                  {map.description ? (
                    <p className="line-clamp-2 text-[13px] text-muted-foreground">
                      {map.description}
                    </p>
                  ) : (
                    <p className="text-[13px] text-muted-foreground/40 italic">
                      No description
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.1" />
                      <circle cx="6" cy="6" r="1.5" fill="currentColor" />
                    </svg>
                    {count(map.components)}{" "}
                    {count(map.components) === 1 ? "component" : "components"}
                  </div>
                </CardContent>

                <CardFooter className="border-t border-border pt-3">
                  <div className="flex w-full items-center justify-between text-[11px] text-muted-foreground/60">
                    <span>Edited {formatDate(map.updated_at)}</span>
                    {map.created_by && (
                      <span className="truncate pl-2 text-right">
                        by {userNames.get(map.created_by) ?? "Unknown"}
                      </span>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}

          {/* Inline create card */}
          <Link href={newModalMapHref} className="group block">
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[13px] font-medium">New Modal Map</span>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
